import { writeZipPackage } from "../vendor/miku-ms-office-core-0.5.1.mjs";
import { buildDocxEntries, buildDocumentXml } from "./docx-package.ts";
import { collectHeadingBookmarks, parseMarkdown } from "./markdown-parser.ts";
import { renderBlocks } from "./ooxml-renderer.ts";
import { createSummary, formatSummary } from "./summary.ts";
import type { ImageAsset, Md2DocxOptions, Md2DocxResult, Md2DocxSummary, RenderContext } from "./types.ts";

export type { ImageAsset, Md2DocxOptions, Md2DocxResult, Md2DocxSummary };
export { formatSummary };

export function convertMarkdownToDocx(markdown: string, options: Md2DocxOptions = {}): Md2DocxResult {
  const tree = parseMarkdown(markdown);
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
  return { docx: writeZipPackage(entries), summary };
}
