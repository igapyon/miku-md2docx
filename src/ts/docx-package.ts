import {
  buildOpcContentTypesXml,
  getZipTextEntry,
  parseOpcContentTypesXml,
  type ZipEntry,
  type ZipEntryInput
} from "../vendor/miku-ms-office-core-0.5.1.mjs";
import type { LoadedDocxTemplatePackage } from "./docx-template-loader.ts";
import type { RenderContext } from "./types.ts";
import { contentTypeForExt } from "./image-assets.ts";
import { documentRelsXml } from "./relationships.ts";
import { appPropsXml, corePropsXml, numberingXml, packageRelsXml, stylesXml } from "./docx-templates.ts";

export function buildDocxEntries(documentXml: string, context: RenderContext): ZipEntryInput[] {
  if (context.templatePackage !== undefined) {
    return buildTemplatedDocxEntries(documentXml, context, context.templatePackage);
  }

  return [
    { path: "[Content_Types].xml", data: contentTypesXml(context.imageMedia) },
    { path: "_rels/.rels", data: packageRelsXml() },
    { path: "docProps/app.xml", data: appPropsXml() },
    { path: "docProps/core.xml", data: corePropsXml() },
    { path: "word/document.xml", data: documentXml },
    { path: "word/_rels/document.xml.rels", data: documentRelsXml(context.relationships) },
    { path: "word/styles.xml", data: stylesXml() },
    { path: "word/numbering.xml", data: numberingXml() },
    ...context.imageMedia
  ];
}

export function buildDocumentXml(body: string, context: RenderContext): string {
  const sectionXml = context.templatePackage === undefined
    ? defaultSectionXml()
    : extractTemplateSectionXml(context.templatePackage) ?? defaultSectionXml();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}${sectionXml}</w:body></w:document>`;
}

function buildTemplatedDocxEntries(
  documentXml: string,
  context: RenderContext,
  templatePackage: LoadedDocxTemplatePackage
): ZipEntryInput[] {
  let entries: ZipEntryInput[] = templatePackage.entries.map((entry) => ({ path: entry.path, data: entry.data }));
  entries = upsertEntry(entries, { path: "[Content_Types].xml", data: contentTypesXml(context.imageMedia, templatePackage.entries) });
  entries = upsertEntry(entries, { path: "_rels/.rels", data: packageRelsXml() });
  entries = upsertEntry(entries, { path: "docProps/app.xml", data: getZipTextEntry(templatePackage.entries, "docProps/app.xml") ?? appPropsXml() });
  entries = upsertEntry(entries, { path: "docProps/core.xml", data: corePropsXml() });
  entries = upsertEntry(entries, { path: "word/document.xml", data: documentXml });
  entries = upsertEntry(entries, { path: "word/_rels/document.xml.rels", data: documentRelsXml(context.relationships) });
  entries = upsertEntry(entries, { path: "word/styles.xml", data: templateStylesXml(templatePackage) });
  entries = upsertEntry(entries, { path: "word/numbering.xml", data: numberingXml() });
  for (const image of context.imageMedia) {
    entries = upsertEntry(entries, image);
  }
  return entries;
}

function templateStylesXml(templatePackage: LoadedDocxTemplatePackage): string {
  const templateXml = templatePackage.stylesBytes === undefined
    ? undefined
    : new TextDecoder().decode(templatePackage.stylesBytes);
  if (templateXml === undefined) {
    return stylesXml();
  }
  return mergeMissingStyles(templateXml, stylesXml());
}

function mergeMissingStyles(templateXml: string, fallbackXml: string): string {
  let merged = templateXml;
  for (const styleId of ["Normal", "Heading1", "Heading2", "Heading3", "Heading4", "Heading5", "Heading6", "Quote", "Code", "Separator", "CodeChar"]) {
    if (new RegExp(`<w:style\\b[^>]*\\bw:styleId=["']${styleId}["']`).test(merged)) {
      continue;
    }
    const styleXml = fallbackXml.match(new RegExp(`<w:style\\b[^>]*\\bw:styleId=["']${styleId}["'][\\s\\S]*?<\\/w:style>`))?.[0];
    if (styleXml !== undefined) {
      merged = merged.replace("</w:styles>", `${styleXml}</w:styles>`);
    }
  }
  return merged;
}

function contentTypesXml(images: ZipEntryInput[], templateEntries?: ZipEntry[]): string {
  if (templateEntries !== undefined) {
    return mergeContentTypesXml(images, templateEntries);
  }

  const defaults = new Set(["png", "jpg", "jpeg", "gif", "webp"]);
  for (const image of images) {
    const ext = image.path.split(".").pop()?.toLowerCase();
    if (ext) defaults.add(ext);
  }
  return buildOpcContentTypesXml({
    defaults: [
      {
        extension: "rels",
        contentType: "application/vnd.openxmlformats-package.relationships+xml"
      },
      { extension: "xml", contentType: "application/xml" },
      ...Array.from(defaults).map((extension) => ({
        extension,
        contentType: contentTypeForExt(extension)
      }))
    ],
    overrides: [
      {
        partName: "word/document.xml",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"
      },
      {
        partName: "word/styles.xml",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"
      },
      {
        partName: "word/numbering.xml",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"
      },
      { partName: "docProps/core.xml", contentType: "application/vnd.openxmlformats-package.core-properties+xml" },
      { partName: "docProps/app.xml", contentType: "application/vnd.openxmlformats-officedocument.extended-properties+xml" }
    ]
  });
}

function mergeContentTypesXml(images: ZipEntryInput[], templateEntries: ZipEntry[]): string {
  const templateXml = getZipTextEntry(templateEntries, "[Content_Types].xml");
  const contentTypes = templateXml === undefined
    ? { defaults: [], overrides: [] }
    : parseOpcContentTypesXml(templateXml);

  const defaults = new Map(contentTypes.defaults.map((item) => [item.extension, item.contentType]));
  defaults.set("rels", "application/vnd.openxmlformats-package.relationships+xml");
  defaults.set("xml", "application/xml");
  for (const image of images) {
    const ext = image.path.split(".").pop()?.toLowerCase();
    if (ext) {
      defaults.set(ext, contentTypeForExt(ext));
    }
  }

  const overrides = new Map(contentTypes.overrides.map((item) => [item.partName, item.contentType]));
  overrides.set("word/document.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml");
  overrides.set("word/styles.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml");
  overrides.set("word/numbering.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml");
  overrides.set("docProps/core.xml", "application/vnd.openxmlformats-package.core-properties+xml");
  overrides.set("docProps/app.xml", "application/vnd.openxmlformats-officedocument.extended-properties+xml");

  return buildOpcContentTypesXml({
    defaults: Array.from(defaults, ([extension, contentType]) => ({ extension, contentType })),
    overrides: Array.from(overrides, ([partName, contentType]) => ({ partName, contentType }))
  });
}

function extractTemplateSectionXml(templatePackage: LoadedDocxTemplatePackage): string | undefined {
  const documentXml = new TextDecoder().decode(templatePackage.documentXmlBytes);
  const sectionXml = documentXml?.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/)?.[0];
  return sectionXml
    ?.replace(/<w:headerReference\b[^>]*\/>/g, "")
    .replace(/<w:footerReference\b[^>]*\/>/g, "");
}

function defaultSectionXml(): string {
  return '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>';
}

function upsertEntry(entries: ZipEntryInput[], entry: ZipEntryInput): ZipEntryInput[] {
  return [...entries.filter((item) => item.path !== entry.path), entry];
}
