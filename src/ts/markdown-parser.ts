import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import type { Md2DocxSummary } from "./types.ts";
import { extractText, normalizeAnchor } from "./anchor-utils.ts";

export function parseMarkdown(markdown: string): any {
  return unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).use(remarkGfm).parse(markdown) as any;
}

export function collectHeadingBookmarks(tree: any, summary: Md2DocxSummary): { headingBookmarks: WeakMap<object, string>; knownBookmarks: Set<string> } {
  const bookmarks = new WeakMap<object, string>();
  const used = new Set<string>();
  for (const child of tree.children ?? []) {
    if (child.type === "yaml") {
      summary.frontMatter = true;
    }
    if (child.type !== "heading") {
      continue;
    }
    const base = normalizeAnchor(extractText(child)) || `heading-${used.size + 1}`;
    let candidate = base;
    let counter = 2;
    while (used.has(candidate)) {
      candidate = `${base}-${counter}`;
      counter += 1;
    }
    used.add(candidate);
    bookmarks.set(child, candidate);
  }
  return { headingBookmarks: bookmarks, knownBookmarks: used };
}
