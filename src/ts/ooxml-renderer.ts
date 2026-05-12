import type { RenderContext } from "./types.ts";
import {
  renderBlockquote,
  renderCodeBlock,
  renderHeading,
  renderHorizontalRule,
  renderHtmlBlock,
  renderList,
  renderParagraph,
  renderTable
} from "./ooxml-block-renderers.ts";

export function renderBlocks(nodes: any[], context: RenderContext, listLevel = 0): string[] {
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
