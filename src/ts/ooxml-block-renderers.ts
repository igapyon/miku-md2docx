import type { RenderContext } from "./types.ts";
import { renderInlineChildren, renderSupportedHtml } from "./ooxml-inline-renderer.ts";
import { paragraphXml, runXml, tableCellXml, tableRowXml, tableXml } from "./ooxml-primitives.ts";
import { escapeAttr, stripHtml } from "./xml-utils.ts";

export function renderParagraph(node: any, context: RenderContext, style = "Normal"): string {
  context.summary.paragraphs += 1;
  const inline = renderInlineChildren(node.children ?? [], context);
  if (!inline.xml) {
    return paragraphXml(runXml(""));
  }
  return paragraphXml(inline.xml, style);
}

export function renderHeading(node: any, context: RenderContext): string {
  context.summary.headings += 1;
  const level = Math.min(Math.max(Number(node.depth) || 1, 1), 6);
  const bookmark = context.headingBookmarks.get(node);
  const bookmarkStart = bookmark ? `<w:bookmarkStart w:id="${context.summary.headings}" w:name="${escapeAttr(bookmark)}"/>` : "";
  const bookmarkEnd = bookmark ? `<w:bookmarkEnd w:id="${context.summary.headings}"/>` : "";
  const inline = renderInlineChildren(node.children ?? [], context);
  return paragraphXml(`${bookmarkStart}${inline.xml}${bookmarkEnd}`, `Heading${level}`);
}

export function renderList(node: any, context: RenderContext, level: number): string[] {
  context.summary.lists += 1;
  const ordered = Boolean(node.ordered);
  const blocks: string[] = [];
  for (const item of node.children ?? []) {
    blocks.push(renderListItem(item, context, ordered, level));
    for (const childList of nestedLists(item)) {
      blocks.push(...renderList(childList, context, level + 1));
    }
  }
  return blocks;
}

export function renderTable(node: any, context: RenderContext): string {
  context.summary.tables += 1;
  const rows = node.children ?? [];
  const rowXml = rows.map((row: any, rowIndex: number) => renderTableRow(row, rowIndex, context)).join("");
  return tableXml(rowXml);
}

export function renderCodeBlock(node: any, context: RenderContext): string[] {
  context.summary.codeBlocks += 1;
  const lines = String(node.value ?? "").split(/\r?\n/);
  return lines.map((line) => paragraphXml(runXml(line, { code: true }), "Code"));
}

export function renderBlockquote(node: any, context: RenderContext): string[] {
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

export function renderHorizontalRule(): string {
  return paragraphXml(runXml("----------"), "Separator");
}

export function renderHtmlBlock(node: any, context: RenderContext): string[] {
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

function renderListItem(item: any, context: RenderContext, ordered: boolean, level: number): string {
  const taskPrefix = typeof item.checked === "boolean" ? `${item.checked ? "[x]" : "[ ]"} ` : "";
  const paragraph = (item.children ?? []).find((child: any) => child.type === "paragraph");
  const paragraphChildren = paragraph?.children ?? [];
  const inlineChildren = taskPrefix ? [{ type: "text", value: taskPrefix }, ...paragraphChildren] : paragraphChildren;
  const itemInline = paragraph
    ? renderInlineChildren(inlineChildren, context).xml
    : runXml(taskPrefix.trim());
  context.summary.listItems += 1;
  return paragraphXml(itemInline, undefined, ordered ? "2" : "1", level);
}

function nestedLists(item: any): any[] {
  return (item.children ?? []).filter((child: any) => child.type === "list");
}

function renderTableRow(row: any, rowIndex: number, context: RenderContext): string {
  const cells = row.children ?? [];
  const cellXml = cells.map((cell: any) => renderTableCell(cell, rowIndex, context)).join("");
  return tableRowXml(cellXml);
}

function renderTableCell(cell: any, rowIndex: number, context: RenderContext): string {
  const inline = renderInlineChildren(cell.children ?? [], context, { bold: rowIndex === 0 });
  return tableCellXml(inline.xml || runXml(""));
}
