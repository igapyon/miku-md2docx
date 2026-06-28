import type { ImageAsset, Md2DocxOptions, Md2DocxResult, Md2DocxSummary } from "./types.ts";

const runtimeGlobal = globalThis as typeof globalThis & {
  __MIKU_MD2DOCX_VERSION?: string;
};

export const productName = "miku-md2docx";
export const version = runtimeGlobal.__MIKU_MD2DOCX_VERSION ?? "0.0.0-dev";

export type { ImageAsset, Md2DocxOptions, Md2DocxResult, Md2DocxSummary };
export { convertMarkdownToDocx, formatSummary } from "./core.ts";
