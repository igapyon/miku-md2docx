import type { RenderContext, RenderedInline, RunStyle } from "./types.ts";
import { renderImage } from "./ooxml-image-renderer.ts";
import { renderLink } from "./ooxml-link-renderer.ts";
import { runXml } from "./ooxml-primitives.ts";
import { stripHtml } from "./xml-utils.ts";

export function renderInlineChildren(nodes: any[], context: RenderContext, inherited: Partial<RunStyle> = {}): RenderedInline {
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
        rendered.push(renderLink({ url: linkOpen[1], children: collected.children }, context, currentStyle, renderInlineChildren));
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

export function renderSupportedHtml(value: string, context: RenderContext, inherited: Partial<RunStyle> = {}): RenderedInline {
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
    return renderLink({ url: link[1], children: [{ type: "text", value: stripHtml(link[2]) }] }, context, inherited, renderInlineChildren);
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
      return renderLink(node, context, inherited, renderInlineChildren);
    case "image":
      return renderImage(node, context);
    case "html":
      return renderSupportedHtml(String(node.value ?? ""), context, inherited);
    default:
      return renderInlineChildren(node.children ?? [], context, inherited);
  }
}
