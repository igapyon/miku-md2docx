import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const runtimePath = path.resolve("bundle/miku-md2docx-runtime.mjs");

async function main() {
  const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));
  const runtime = await import(pathToFileURL(runtimePath).href);

  if (runtime.productName !== "miku-md2docx") {
    throw new Error(`Unexpected runtime product name: ${runtime.productName}`);
  }
  if (runtime.version !== packageJson.version) {
    throw new Error(`Unexpected runtime version: ${runtime.version}`);
  }
  if (typeof runtime.convertMarkdownToDocx !== "function") {
    throw new Error("Runtime bundle does not export convertMarkdownToDocx.");
  }
  if (typeof runtime.formatSummary !== "function") {
    throw new Error("Runtime bundle does not export formatSummary.");
  }

  const result = runtime.convertMarkdownToDocx("# Runtime Smoke\n\nHello.\n");
  if (!(result.docx instanceof Uint8Array) || result.docx.length < 100) {
    throw new Error("Runtime bundle conversion did not return a DOCX byte array.");
  }
  if (result.summary.headings !== 1) {
    throw new Error(`Unexpected runtime conversion heading count: ${result.summary.headings}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
