import type { RenderContext, RenderedInline, RunStyle } from "./types.ts";
import { normalizeAnchor } from "./anchor-utils.ts";
import { addRelationship, REL_HYPERLINK } from "./relationships.ts";
import { escapeAttr } from "./xml-utils.ts";

export function renderLink(
  node: any,
  context: RenderContext,
  inherited: Partial<RunStyle>,
  renderInlineChildren: (nodes: any[], context: RenderContext, inherited: Partial<RunStyle>) => RenderedInline
): RenderedInline {
  context.summary.links += 1;
  const url = String(node.url ?? "");
  const inline = renderInlineChildren(node.children ?? [], context, inherited);
  if (url.startsWith("#")) {
    return renderInternalLink(url, inline, context);
  }
  return renderExternalLink(url, inline, context);
}

function renderInternalLink(url: string, inline: RenderedInline, context: RenderContext): RenderedInline {
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

function renderExternalLink(url: string, inline: RenderedInline, context: RenderContext): RenderedInline {
  context.summary.externalLinks += 1;
  const relId = addRelationship(context, REL_HYPERLINK, url, "External");
  return {
    xml: `<w:hyperlink r:id="${relId}" w:history="1">${inline.xml}</w:hyperlink>`,
    text: inline.text
  };
}
