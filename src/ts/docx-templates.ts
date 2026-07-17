import { REL_OFFICE_DOCUMENT } from "./relationships.ts";

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

interface HeadingStyle {
  id: string;
  name: string;
  outlineLevel: number;
  size?: number;
}

interface NumberingLevel {
  level: number;
  format: "bullet" | "decimal";
  text: string;
  indent: number;
}

const HEADING_STYLES: HeadingStyle[] = [
  { id: "Heading1", name: "heading 1", outlineLevel: 0, size: 32 },
  { id: "Heading2", name: "heading 2", outlineLevel: 1, size: 28 },
  { id: "Heading3", name: "heading 3", outlineLevel: 2, size: 24 },
  { id: "Heading4", name: "heading 4", outlineLevel: 3 },
  { id: "Heading5", name: "heading 5", outlineLevel: 4 },
  { id: "Heading6", name: "heading 6", outlineLevel: 5 }
];

const BULLET_LEVELS: NumberingLevel[] = [
  { level: 0, format: "bullet", text: "•", indent: 720 },
  { level: 1, format: "bullet", text: "•", indent: 1440 },
  { level: 2, format: "bullet", text: "•", indent: 2160 }
];

const DECIMAL_LEVELS: NumberingLevel[] = [
  { level: 0, format: "decimal", text: "%1.", indent: 720 },
  { level: 1, format: "decimal", text: "%2.", indent: 1440 },
  { level: 2, format: "decimal", text: "%3.", indent: 2160 }
];

export function packageRelsXml(): string {
  return [
    XML_DECLARATION,
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    `<Relationship Id="rId1" Type="${REL_OFFICE_DOCUMENT}" Target="word/document.xml"/>`,
    "</Relationships>"
  ].join("");
}

export function stylesXml(): string {
  return [
    XML_DECLARATION,
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    normalStyleXml(),
    ...HEADING_STYLES.map(headingStyleXml),
    quoteStyleXml(),
    codeStyleXml(),
    separatorStyleXml(),
    codeCharStyleXml(),
    "</w:styles>"
  ].join("");
}

export function numberingXml(): string {
  return [
    XML_DECLARATION,
    '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    abstractNumberingXml(0, BULLET_LEVELS, "bullet"),
    abstractNumberingXml(1, DECIMAL_LEVELS, "decimal"),
    '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>',
    '<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>',
    "</w:numbering>"
  ].join("");
}

export function settingsXml(templateXml?: string): string {
  const compatibilitySetting = '<w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>';
  if (templateXml === undefined) {
    return [
      XML_DECLARATION,
      '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      `<w:compat>${compatibilitySetting}</w:compat>`,
      "</w:settings>"
    ].join("");
  }

  const existingCompatibilityMode = /<w:compatSetting\b(?=[^>]*\bw:name=(?:"compatibilityMode"|'compatibilityMode'))[^>]*(?:\/>|>\s*<\/w:compatSetting>)/;
  if (existingCompatibilityMode.test(templateXml)) {
    return templateXml.replace(existingCompatibilityMode, compatibilitySetting);
  }
  if (/<w:compat\s*\/>/.test(templateXml)) {
    return templateXml.replace(/<w:compat\s*\/>/, `<w:compat>${compatibilitySetting}</w:compat>`);
  }
  if (/<w:compat\b[^>]*>/.test(templateXml)) {
    return templateXml.replace("</w:compat>", `${compatibilitySetting}</w:compat>`);
  }
  return templateXml.replace("</w:settings>", `<w:compat>${compatibilitySetting}</w:compat></w:settings>`);
}

export function corePropsXml(): string {
  return [
    XML_DECLARATION,
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ',
    'xmlns:dc="http://purl.org/dc/elements/1.1/" ',
    'xmlns:dcterms="http://purl.org/dc/terms/" ',
    'xmlns:dcmitype="http://purl.org/dc/dcmitype/" ',
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
    "<dc:creator>miku-md2docx</dc:creator>",
    "<cp:lastModifiedBy>miku-md2docx</cp:lastModifiedBy>",
    "</cp:coreProperties>"
  ].join("");
}

export function appPropsXml(): string {
  return [
    XML_DECLARATION,
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ',
    'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">',
    "<Application>miku-md2docx</Application>",
    "</Properties>"
  ].join("");
}

function normalStyleXml(): string {
  return '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>';
}

function headingStyleXml(style: HeadingStyle): string {
  const sizeXml = style.size ? `<w:sz w:val="${style.size}"/>` : "";
  return [
    `<w:style w:type="paragraph" w:styleId="${style.id}">`,
    `<w:name w:val="${style.name}"/>`,
    '<w:basedOn w:val="Normal"/>',
    `<w:pPr><w:outlineLvl w:val="${style.outlineLevel}"/></w:pPr>`,
    `<w:rPr><w:b/>${sizeXml}</w:rPr>`,
    "</w:style>"
  ].join("");
}

function quoteStyleXml(): string {
  return [
    '<w:style w:type="paragraph" w:styleId="Quote">',
    '<w:name w:val="Quote"/>',
    '<w:basedOn w:val="Normal"/>',
    '<w:pPr><w:ind w:left="720"/></w:pPr>',
    "<w:rPr><w:i/></w:rPr>",
    "</w:style>"
  ].join("");
}

function codeStyleXml(): string {
  return [
    '<w:style w:type="paragraph" w:styleId="Code">',
    '<w:name w:val="Code"/>',
    '<w:basedOn w:val="Normal"/>',
    '<w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/></w:rPr>',
    "</w:style>"
  ].join("");
}

function separatorStyleXml(): string {
  return [
    '<w:style w:type="paragraph" w:styleId="Separator">',
    '<w:name w:val="Separator"/>',
    '<w:basedOn w:val="Normal"/>',
    '<w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr></w:pPr>',
    "</w:style>"
  ].join("");
}

function codeCharStyleXml(): string {
  return [
    '<w:style w:type="character" w:styleId="CodeChar">',
    '<w:name w:val="Code Char"/>',
    '<w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/></w:rPr>',
    "</w:style>"
  ].join("");
}

function abstractNumberingXml(id: number, levels: NumberingLevel[], kind: "bullet" | "decimal"): string {
  return [
    `<w:abstractNum w:abstractNumId="${id}">`,
    `<w:nsid w:val="${kind === "bullet" ? "5A6B7C01" : "5A6B7C02"}"/>`,
    '<w:multiLevelType w:val="hybridMultilevel"/>',
    `<w:tmpl w:val="${kind === "bullet" ? "11111111" : "22222222"}"/>`,
    ...levels.map(numberingLevelXml),
    "</w:abstractNum>"
  ].join("");
}

function numberingLevelXml(level: NumberingLevel): string {
  return [
    `<w:lvl w:ilvl="${level.level}">`,
    '<w:start w:val="1"/>',
    `<w:numFmt w:val="${level.format}"/>`,
    `<w:lvlText w:val="${level.text}"/>`,
    '<w:lvlJc w:val="left"/>',
    `<w:pPr><w:ind w:left="${level.indent}" w:hanging="360"/></w:pPr>`,
    level.format === "bullet" ? '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:hint="default"/></w:rPr>' : "",
    "</w:lvl>"
  ].join("");
}
