import type { ZipFileEntry } from "./zip-io.ts";

export interface ImageAsset {
  path: string;
  data: Uint8Array;
}

export interface Md2DocxOptions {
  inputPath?: string;
  imageLoader?: (path: string) => ImageAsset | undefined;
}

export interface Md2DocxSummary {
  paragraphs: number;
  headings: number;
  links: number;
  internalLinks: number;
  externalLinks: number;
  unresolvedInternalLinks: number;
  lists: number;
  listItems: number;
  tables: number;
  codeBlocks: number;
  blockquotes: number;
  horizontalRules: number;
  images: number;
  embeddedImages: number;
  missingImages: number;
  resizedImages: number;
  frontMatter: boolean;
  unsupportedHtml: number;
  missingImageDetails: Array<{ path: string; alt: string }>;
}

export interface Md2DocxResult {
  docx: Uint8Array;
  summary: Md2DocxSummary;
}

export interface Relationship {
  id: string;
  type: string;
  target: string;
  targetMode?: string;
}

export interface RenderContext {
  summary: Md2DocxSummary;
  relationships: Relationship[];
  headingBookmarks: WeakMap<object, string>;
  knownBookmarks: Set<string>;
  imageMedia: ZipFileEntry[];
  nextRelId: number;
  nextDocPrId: number;
  options: Md2DocxOptions;
}

export interface RenderedInline {
  xml: string;
  text: string;
}

export interface RunStyle {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  underline: boolean;
  code: boolean;
}
