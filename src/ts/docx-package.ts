import { buildOpcContentTypesXml, type ZipEntryInput } from "../vendor/miku-ms-office-core-0.5.1.mjs";
import type { RenderContext } from "./types.ts";
import { contentTypeForExt } from "./image-assets.ts";
import { documentRelsXml } from "./relationships.ts";
import { appPropsXml, corePropsXml, numberingXml, packageRelsXml, stylesXml } from "./docx-templates.ts";

export function buildDocxEntries(documentXml: string, context: RenderContext): ZipEntryInput[] {
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

export function buildDocumentXml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

function contentTypesXml(images: ZipEntryInput[]): string {
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
