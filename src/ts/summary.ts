import type { Md2DocxSummary } from "./types.ts";

export function createSummary(): Md2DocxSummary {
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
