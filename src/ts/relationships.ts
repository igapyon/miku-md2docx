import type { RenderContext, Relationship } from "./types.ts";
import { escapeAttr } from "./xml-utils.ts";

export const REL_OFFICE_DOCUMENT = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";
export const REL_HYPERLINK = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink";
export const REL_IMAGE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
export const REL_STYLES = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles";
export const REL_NUMBERING = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering";

const REQUIRED_DOCUMENT_RELATIONSHIPS: Relationship[] = [
  { id: "rIdStyles", type: REL_STYLES, target: "styles.xml" },
  { id: "rIdNumbering", type: REL_NUMBERING, target: "numbering.xml" }
];

export function addRelationship(context: RenderContext, type: string, target: string, targetMode?: string): string {
  const id = `rId${context.nextRelId++}`;
  context.relationships.push({ id, type, target, targetMode });
  return id;
}

export function documentRelsXml(relationships: Relationship[]): string {
  const rels = [...REQUIRED_DOCUMENT_RELATIONSHIPS, ...relationships].map((rel) => {
    const mode = rel.targetMode ? ` TargetMode="${escapeAttr(rel.targetMode)}"` : "";
    return `<Relationship Id="${rel.id}" Type="${escapeAttr(rel.type)}" Target="${escapeAttr(rel.target)}"${mode}/>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`;
}
