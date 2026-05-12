import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { createZip, type ZipFileEntry } from "./zip-io.ts";

export interface ImageAsset {
  path: string;
  data: Uint8Array;
}

export interface Md2DocxOptions {
  inputPath?: string;
  imageLoader?: (path: string) => ImageAsset | undefined;
}

export interface Md2DocxSummary {
  paragraphs: number;
  headings: number;
  links: number;
  internalLinks: number;
  externalLinks: number;
  unresolvedInternalLinks: number;
  lists: number;
  listItems: number;
  tables: number;
  codeBlocks: number;
  blockquotes: number;
  horizontalRules: number;
  images: number;
  embeddedImages: number;
  missingImages: number;
  resizedImages: number;
  frontMatter: boolean;
  unsupportedHtml: number;
  missingImageDetails: Array<{ path: string; alt: string }>;
}

export interface Md2DocxResult {
  docx: Uint8Array;
  summary: Md2DocxSummary;
}

interface Relationship {
  id: string;
  type: string;
  target: string;
  targetMode?: string;
}

interface RenderContext {
  summary: Md2DocxSummary;
  relationships: Relationship[];
  headingBookmarks: WeakMap<object, string>;
  knownBookmarks: Set<string>;
  imageMedia: ZipFileEntry[];
  nextRelId: number;
  nextDocPrId: number;
  options: Md2DocxOptions;
}

interface RenderedInline {
  xml: string;
  text: string;
}

const REL_OFFICE_DOCUMENT = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";
const REL_HYPERLINK = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink";
const REL_IMAGE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
const DOC_BODY_WIDTH_EMU = 5943600;
const EMU_PER_PIXEL_AT_96_DPI = 9525;

export function convertMarkdownToDocx(markdown: string, options: Md2DocxOptions = {}): Md2DocxResult {
  const tree = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).use(remarkGfm).parse(markdown) as any;
  const summary = createSummary();
  const { headingBookmarks, knownBookmarks } = collectHeadingBookmarks(tree, summary);
  const context: RenderContext = {
    summary,
    relationships: [],
    headingBookmarks,
    knownBookmarks,
    imageMedia: [],
    nextRelId: 1,
    nextDocPrId: 1,
    options
  };

  const bodyBlocks = renderBlocks(tree.children ?? [], context);
  const documentXml = buildDocumentXml(bodyBlocks.join(""));
  const entries = buildDocxEntries(documentXml, context);
  return { docx: createZip(entries), summary };
}

export function formatSummary(summary: Md2DocxSummary): string {
  const lines = [
    `paragraphs: ${summary.paragraphs}`,
    `headings: ${summary.headings}`,
    `links: ${summary.links}`,
    `internalLinks: ${summary.internalLinks}`,
    `externalLinks: ${summary.externalLinks}`,
    `unresolvedInternalLinks: ${summary.unresolvedInternalLinks}`,
    `lists: ${summary.lists}`,
    `listItems: ${summary.listItems}`,
    `tables: ${summary.tables}`,
    `codeBlocks: ${summary.codeBlocks}`,
    `blockquotes: ${summary.blockquotes}`,
    `horizontalRules: ${summary.horizontalRules}`,
    `images: ${summary.images}`,
    `embeddedImages: ${summary.embeddedImages}`,
    `missingImages: ${summary.missingImages}`,
    `resizedImages: ${summary.resizedImages}`,
    `frontMatter: ${summary.frontMatter}`,
    `unsupportedHtml: ${summary.unsupportedHtml}`
  ];
  if (summary.missingImageDetails.length > 0) {
    lines.push("missingImageDetails:");
    for (const detail of summary.missingImageDetails) {
      lines.push(`- path: ${detail.path}`);
      lines.push(`  alt: ${detail.alt}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function createSummary(): Md2DocxSummary {
  return {
    paragraphs: 0,
    headings: 0,
    links: 0,
    internalLinks: 0,
    externalLinks: 0,
    unresolvedInternalLinks: 0,
    lists: 0,
    listItems: 0,
    tables: 0,
    codeBlocks: 0,
    blockquotes: 0,
    horizontalRules: 0,
    images: 0,
    embeddedImages: 0,
    missingImages: 0,
    resizedImages: 0,
    frontMatter: false,
    unsupportedHtml: 0,
    missingImageDetails: []
  };
}

function collectHeadingBookmarks(tree: any, summary: Md2DocxSummary): { headingBookmarks: WeakMap<object, string>; knownBookmarks: Set<string> } {
  const bookmarks = new WeakMap<object, string>();
  const used = new Set<string>();
  for (const child of tree.children ?? []) {
    if (child.type === "yaml") {
      summary.frontMatter = true;
    }
    if (child.type !== "heading") {
      continue;
    }
    const base = normalizeAnchor(extractText(child)) || `heading-${used.size + 1}`;
    let candidate = base;
    let counter = 2;
    while (used.has(candidate)) {
      candidate = `${base}-${counter}`;
      counter += 1;
    }
    used.add(candidate);
    bookmarks.set(child, candidate);
  }
  return { headingBookmarks: bookmarks, knownBookmarks: used };
}

function renderBlocks(nodes: any[], context: RenderContext, listLevel = 0): string[] {
  const blocks: string[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case "yaml":
        break;
      case "paragraph":
        blocks.push(renderParagraph(node, context));
        break;
      case "heading":
        blocks.push(renderHeading(node, context));
        break;
      case "list":
        blocks.push(...renderList(node, context, listLevel));
        break;
      case "table":
        blocks.push(renderTable(node, context));
        break;
      case "code":
        blocks.push(...renderCodeBlock(node, context));
        break;
      case "blockquote":
        context.summary.blockquotes += 1;
        blocks.push(...renderBlockquote(node, context));
        break;
      case "thematicBreak":
        context.summary.horizontalRules += 1;
        blocks.push(renderHorizontalRule());
        break;
      case "html":
        blocks.push(...renderHtmlBlock(node, context));
        break;
      default:
        break;
    }
  }
  return blocks;
}

function renderParagraph(node: any, context: RenderContext, style = "Normal"): string {
  context.summary.paragraphs += 1;
  const inline = renderInlineChildren(node.children ?? [], context);
  if (!inline.xml) {
    return paragraphXml(runXml(""));
  }
  return paragraphXml(inline.xml, style);
}

function renderHeading(node: any, context: RenderContext): string {
  context.summary.headings += 1;
  const level = Math.min(Math.max(Number(node.depth) || 1, 1), 6);
  const bookmark = context.headingBookmarks.get(node);
  const bookmarkStart = bookmark ? `<w:bookmarkStart w:id="${context.summary.headings}" w:name="${escapeAttr(bookmark)}"/>` : "";
  const bookmarkEnd = bookmark ? `<w:bookmarkEnd w:id="${context.summary.headings}"/>` : "";
  const inline = renderInlineChildren(node.children ?? [], context);
  return paragraphXml(`${bookmarkStart}${inline.xml}${bookmarkEnd}`, `Heading${level}`);
}

function renderList(node: any, context: RenderContext, level: number): string[] {
  context.summary.lists += 1;
  const ordered = Boolean(node.ordered);
  const blocks: string[] = [];
  for (const item of node.children ?? []) {
    const taskPrefix = typeof item.checked === "boolean" ? `${item.checked ? "[x]" : "[ ]"} ` : "";
    const paragraph = (item.children ?? []).find((child: any) => child.type === "paragraph");
    const itemInline = paragraph
      ? renderInlineChildren([{ type: "text", value: taskPrefix }, ...(paragraph.children ?? [])], context).xml
      : runXml(taskPrefix.trim());
    context.summary.listItems += 1;
    blocks.push(paragraphXml(itemInline, undefined, ordered ? "2" : "1", level));
    const nested = (item.children ?? []).filter((child: any) => child.type === "list");
    for (const childList of nested) {
      blocks.push(...renderList(childList, context, level + 1));
    }
  }
  return blocks;
}

function renderTable(node: any, context: RenderContext): string {
  context.summary.tables += 1;
  const rows = node.children ?? [];
  const rowXml = rows.map((row: any, rowIndex: number) => {
    const cells = row.children ?? [];
    const cellXml = cells.map((cell: any) => {
      const inline = renderInlineChildren(cell.children ?? [], context, { bold: rowIndex === 0 });
      return `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>${paragraphXml(inline.xml || runXml(""))}</w:tc>`;
    }).join("");
    return `<w:tr>${cellXml}</w:tr>`;
  }).join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr>${rowXml}</w:tbl>`;
}

function renderCodeBlock(node: any, context: RenderContext): string[] {
  context.summary.codeBlocks += 1;
  const lines = String(node.value ?? "").split(/\r?\n/);
  return lines.map((line) => paragraphXml(runXml(line, { code: true }), "Code"));
}

function renderBlockquote(node: any, context: RenderContext): string[] {
  const blocks: string[] = [];
  for (const child of node.children ?? []) {
    if (child.type === "paragraph") {
      blocks.push(renderParagraph(child, context, "Quote"));
    } else if (child.type === "blockquote") {
      blocks.push(...renderBlockquote(child, context));
    }
  }
  return blocks;
}

function renderHorizontalRule(): string {
  return paragraphXml(runXml("----------"), "Separator");
}

function renderHtmlBlock(node: any, context: RenderContext): string[] {
  const value = String(node.value ?? "");
  const inline = renderSupportedHtml(value, context);
  if (inline.xml) {
    context.summary.paragraphs += 1;
    return [paragraphXml(inline.xml)];
  }
  context.summary.unsupportedHtml += 1;
  const text = stripHtml(value).trim();
  return text ? [paragraphXml(runXml(text))] : [];
}

function renderInlineChildren(nodes: any[], context: RenderContext, inherited: Partial<RunStyle> = {}): RenderedInline {
  const rendered: RenderedInline[] = [];
  let currentStyle = { ...inherited };
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node.type === "html") {
      const html = String(node.value ?? "").trim();
      if (/^<ins>$/i.test(html)) {
        currentStyle = { ...currentStyle, underline: true };
        continue;
      }
      if (/^<\/ins>$/i.test(html)) {
        currentStyle = { ...currentStyle, underline: false };
        continue;
      }
      const linkOpen = html.match(/^<a\s+[^>]*href=["']([^"']+)["'][^>]*>$/i);
      if (linkOpen) {
        const collected = collectUntilClosingHtml(nodes, index + 1, "a");
        rendered.push(renderLink({ url: linkOpen[1], children: collected.children }, context, currentStyle));
        index = collected.endIndex;
        continue;
      }
    }
    rendered.push(renderInline(node, context, currentStyle));
  }
  return {
    xml: rendered.map((part) => part.xml).join(""),
    text: rendered.map((part) => part.text).join("")
  };
}

function collectUntilClosingHtml(nodes: any[], startIndex: number, tagName: string): { children: any[]; endIndex: number } {
  const children = [];
  for (let index = startIndex; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node.type === "html" && new RegExp(`^<\\/${tagName}>$`, "i").test(String(node.value ?? "").trim())) {
      return { children, endIndex: index };
    }
    children.push(node);
  }
  return { children, endIndex: nodes.length - 1 };
}

interface RunStyle {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  underline: boolean;
  code: boolean;
}

function renderInline(node: any, context: RenderContext, inherited: Partial<RunStyle>): RenderedInline {
  switch (node.type) {
    case "text":
      return { xml: runXml(String(node.value ?? ""), inherited), text: String(node.value ?? "") };
    case "strong":
      return renderInlineChildren(node.children ?? [], context, { ...inherited, bold: true });
    case "emphasis":
      return renderInlineChildren(node.children ?? [], context, { ...inherited, italic: true });
    case "delete":
      return renderInlineChildren(node.children ?? [], context, { ...inherited, strike: true });
    case "inlineCode":
      return { xml: runXml(String(node.value ?? ""), { ...inherited, code: true }), text: String(node.value ?? "") };
    case "break":
      return { xml: "<w:r><w:br/></w:r>", text: "\n" };
    case "link":
      return renderLink(node, context, inherited);
    case "image":
      return renderImage(node, context);
    case "html":
      return renderSupportedHtml(String(node.value ?? ""), context, inherited);
    default:
      return renderInlineChildren(node.children ?? [], context, inherited);
  }
}

function renderLink(node: any, context: RenderContext, inherited: Partial<RunStyle>): RenderedInline {
  context.summary.links += 1;
  const url = String(node.url ?? "");
  const inline = renderInlineChildren(node.children ?? [], context, inherited);
  if (url.startsWith("#")) {
    context.summary.internalLinks += 1;
    const anchor = normalizeAnchor(url.slice(1));
    if (context.knownBookmarks.has(anchor)) {
      return {
        xml: `<w:hyperlink w:anchor="${escapeAttr(anchor)}" w:history="1">${inline.xml}</w:hyperlink>`,
        text: inline.text
      };
    }
    context.summary.unresolvedInternalLinks += 1;
    return inline;
  }
  context.summary.externalLinks += 1;
  const relId = addRelationship(context, REL_HYPERLINK, url, "External");
  return {
    xml: `<w:hyperlink r:id="${relId}" w:history="1">${inline.xml}</w:hyperlink>`,
    text: inline.text
  };
}

function renderImage(node: any, context: RenderContext): RenderedInline {
  const url = String(node.url ?? "");
  const alt = String(node.alt ?? "");
  context.summary.images += 1;
  const asset = context.options.imageLoader?.(url);
  if (!asset) {
    context.summary.missingImages += 1;
    context.summary.missingImageDetails.push({ path: url, alt });
    const fallback = `[Missing image: ${alt || url}]`;
    return { xml: runXml(fallback), text: fallback };
  }
  const mediaPath = `word/media/${safeMediaName(context.summary.embeddedImages + 1, asset.path)}`;
  const relId = addRelationship(context, REL_IMAGE, mediaPath.replace(/^word\//, ""));
  const size = imageSize(asset.data);
  const naturalWidth = (size?.width ?? 320) * EMU_PER_PIXEL_AT_96_DPI;
  const naturalHeight = (size?.height ?? 240) * EMU_PER_PIXEL_AT_96_DPI;
  const displayWidth = Math.min(naturalWidth, DOC_BODY_WIDTH_EMU);
  const displayHeight = Math.round(displayWidth * naturalHeight / naturalWidth);
  if (displayWidth < naturalWidth) {
    context.summary.resizedImages += 1;
  }
  context.summary.embeddedImages += 1;
  context.imageMedia.push({ path: mediaPath, data: asset.data });
  return {
    xml: drawingXml(relId, alt, displayWidth, displayHeight, context.nextDocPrId++),
    text: alt
  };
}

function renderSupportedHtml(value: string, context: RenderContext, inherited: Partial<RunStyle> = {}): RenderedInline {
  const trimmed = value.trim();
  if (/^<br\s*\/?>$/i.test(trimmed)) {
    return { xml: "<w:r><w:br/></w:r>", text: "\n" };
  }
  const ins = trimmed.match(/^<ins>([\s\S]*)<\/ins>$/i);
  if (ins) {
    return { xml: runXml(stripHtml(ins[1]), { ...inherited, underline: true }), text: stripHtml(ins[1]) };
  }
  const link = trimmed.match(/^<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*)<\/a>$/i);
  if (link) {
    return renderLink({ url: link[1], children: [{ type: "text", value: stripHtml(link[2]) }] }, context, inherited);
  }
  const image = trimmed.match(/^<img\s+[^>]*src=["']([^"']+)["'][^>]*>/i);
  if (image) {
    const alt = trimmed.match(/\salt=["']([^"']*)["']/i)?.[1] ?? "";
    return renderImage({ url: image[1], alt }, context);
  }
  context.summary.unsupportedHtml += 1;
  const text = stripHtml(value);
  return { xml: runXml(text, inherited), text };
}

function paragraphXml(content: string, style?: string, numId?: string, level?: number): string {
  const styleXml = style ? `<w:pStyle w:val="${escapeAttr(style)}"/>` : "";
  const numXml = numId ? `<w:numPr><w:ilvl w:val="${level ?? 0}"/><w:numId w:val="${numId}"/></w:numPr>` : "";
  const pPr = styleXml || numXml ? `<w:pPr>${styleXml}${numXml}</w:pPr>` : "";
  return `<w:p>${pPr}${content}</w:p>`;
}

function runXml(text: string, style: Partial<RunStyle> = {}): string {
  const preserve = /^\s|\s$|\s{2,}/.test(text) ? ' xml:space="preserve"' : "";
  const props = [
    style.bold ? "<w:b/>" : "",
    style.italic ? "<w:i/>" : "",
    style.strike ? "<w:strike/>" : "",
    style.underline ? '<w:u w:val="single"/>' : "",
    style.code ? '<w:rStyle w:val="CodeChar"/>' : ""
  ].join("");
  const rPr = props ? `<w:rPr>${props}</w:rPr>` : "";
  return `<w:r>${rPr}<w:t${preserve}>${escapeXml(text)}</w:t></w:r>`;
}

function drawingXml(relId: string, alt: string, cx: number, cy: number, docPrId: number): string {
  const escapedAlt = escapeAttr(alt);
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${docPrId}" name="Image ${docPrId}" descr="${escapedAlt}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${docPrId}" name="Image ${docPrId}" descr="${escapedAlt}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

function addRelationship(context: RenderContext, type: string, target: string, targetMode?: string): string {
  const id = `rId${context.nextRelId++}`;
  context.relationships.push({ id, type, target, targetMode });
  return id;
}

function buildDocxEntries(documentXml: string, context: RenderContext): ZipFileEntry[] {
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

function buildDocumentXml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

function contentTypesXml(images: ZipFileEntry[]): string {
  const defaults = new Set(["png", "jpg", "jpeg", "gif", "webp"]);
  for (const image of images) {
    const ext = image.path.split(".").pop()?.toLowerCase();
    if (ext) defaults.add(ext);
  }
  const imageDefaults = [...defaults].map((ext) => `<Default Extension="${escapeAttr(ext)}" ContentType="${escapeAttr(contentTypeForExt(ext))}"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${imageDefaults}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
}

function packageRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL_OFFICE_DOCUMENT}" Target="word/document.xml"/></Relationships>`;
}

function documentRelsXml(relationships: Relationship[]): string {
  const rels = relationships.map((rel) => {
    const mode = rel.targetMode ? ` TargetMode="${escapeAttr(rel.targetMode)}"` : "";
    return `<Relationship Id="${rel.id}" Type="${escapeAttr(rel.type)}" Target="${escapeAttr(rel.target)}"${mode}/>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`;
}

function stylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="3"/></w:pPr><w:rPr><w:b/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading5"><w:name w:val="heading 5"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="4"/></w:pPr><w:rPr><w:b/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading6"><w:name w:val="heading 6"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="5"/></w:pPr><w:rPr><w:b/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="720"/></w:pPr><w:rPr><w:i/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Separator"><w:name w:val="Separator"/><w:basedOn w:val="Normal"/><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr></w:pPr></w:style><w:style w:type="character" w:styleId="CodeChar"><w:name w:val="Code Char"/><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/></w:rPr></w:style></w:styles>`;
}

function numberingXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="2"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%2."/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl><w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%3."/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num></w:numbering>`;
}

function corePropsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>miku-md2docx</dc:creator><cp:lastModifiedBy>miku-md2docx</cp:lastModifiedBy></cp:coreProperties>`;
}

function appPropsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>miku-md2docx</Application></Properties>`;
}

function normalizeAnchor(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function extractText(node: any): string {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map((child: any) => extractText(child)).join("");
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

function safeMediaName(index: number, path: string): string {
  const file = path.split(/[\\/]/).pop() || `image-${index}.bin`;
  const ext = file.includes(".") ? file.split(".").pop() : "bin";
  return `image-${index}.${String(ext).toLowerCase().replace(/[^a-z0-9]/g, "") || "bin"}`;
}

function imageSize(data: Uint8Array): { width: number; height: number } | undefined {
  if (data.length >= 24 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return { width: readBe32(data, 16), height: readBe32(data, 20) };
  }
  if (data.length >= 10 && data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
    return { width: readLe16(data, 6), height: readLe16(data, 8) };
  }
  if (data.length >= 4 && data[0] === 0xff && data[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < data.length) {
      if (data[offset] !== 0xff) return undefined;
      const marker = data[offset + 1];
      const length = readBe16(data, offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { height: readBe16(data, offset + 5), width: readBe16(data, offset + 7) };
      }
      offset += 2 + length;
    }
  }
  return undefined;
}

function readBe16(data: Uint8Array, offset: number): number {
  return (data[offset] << 8) | data[offset + 1];
}

function readLe16(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8);
}

function readBe32(data: Uint8Array, offset: number): number {
  return ((data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3]) >>> 0;
}

function contentTypeForExt(ext: string): string {
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeXml(value).replace(/"/g, "&quot;");
}
