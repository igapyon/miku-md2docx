import type { RunStyle } from "./types.ts";
import { escapeAttr, escapeXml } from "./xml-utils.ts";

export function paragraphXml(content: string, style?: string, numId?: string, level?: number): string {
  const styleXml = style ? `<w:pStyle w:val="${escapeAttr(style)}"/>` : "";
  const numXml = numId ? `<w:numPr><w:ilvl w:val="${level ?? 0}"/><w:numId w:val="${numId}"/></w:numPr>` : "";
  const pPr = styleXml || numXml ? `<w:pPr>${styleXml}${numXml}</w:pPr>` : "";
  return `<w:p>${pPr}${content}</w:p>`;
}

export function runXml(text: string, style: Partial<RunStyle> = {}): string {
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

export function drawingXml(relId: string, alt: string, cx: number, cy: number, docPrId: number): string {
  const escapedAlt = escapeAttr(alt);
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${docPrId}" name="Image ${docPrId}" descr="${escapedAlt}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${docPrId}" name="Image ${docPrId}" descr="${escapedAlt}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

export function tableXml(rows: string): string {
  return `<w:tbl>${tablePropertiesXml()}${rows}</w:tbl>`;
}

export function tableRowXml(cells: string): string {
  return `<w:tr>${cells}</w:tr>`;
}

export function tableCellXml(content: string): string {
  return `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>${paragraphXml(content)}</w:tc>`;
}

function tablePropertiesXml(): string {
  return [
    '<w:tblPr><w:tblW w:w="0" w:type="auto"/>',
    "<w:tblBorders>",
    '<w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>',
    '<w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>',
    '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>',
    '<w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>',
    '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>',
    '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>',
    "</w:tblBorders></w:tblPr>"
  ].join("");
}
