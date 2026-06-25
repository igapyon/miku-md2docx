import type { RenderContext, Relationship } from "./types.ts";
import { buildOpcRelationshipsXml, type OpcRelationship } from "../vendor/miku-ms-office-core-0.5.1.mjs";

export const REL_OFFICE_DOCUMENT = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";
export const REL_HYPERLINK = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink";
export const REL_IMAGE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
export const REL_STYLES = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles";
export const REL_NUMBERING = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering";

const REQUIRED_DOCUMENT_RELATIONSHIPS: OpcRelationship[] = [
  { id: "rIdStyles", type: REL_STYLES, target: "styles.xml" },
  { id: "rIdNumbering", type: REL_NUMBERING, target: "numbering.xml" }
];

export function addRelationship(context: RenderContext, type: string, target: string, targetMode?: string): string {
  const id = `rId${context.nextRelId++}`;
  context.relationships.push({ id, type, target, targetMode });
  return id;
}

export function documentRelsXml(relationships: Relationship[]): string {
  return buildOpcRelationshipsXml([...REQUIRED_DOCUMENT_RELATIONSHIPS, ...relationships]);
}
