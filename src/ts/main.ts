import { convertMarkdownToDocx, formatSummary, type ImageAsset } from "./core.ts";

const markdownInput = byId<HTMLInputElement>("markdownInput");
const imageInput = byId<HTMLInputElement>("imageInput");
const convertButton = byId<HTMLButtonElement>("convertButton");
const downloadButton = byId<HTMLButtonElement>("downloadButton");
const summaryOutput = byId<HTMLPreElement>("summaryOutput");
const statusOutput = byId<HTMLDivElement>("statusOutput");

let lastDocx: Uint8Array | undefined;
let lastOutputName = "document.docx";

convertButton.addEventListener("click", () => {
  void convertSelectedMarkdown();
});

downloadButton.addEventListener("click", () => {
  if (!lastDocx) return;
  const blob = new Blob([lastDocx], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = lastOutputName;
  anchor.click();
  URL.revokeObjectURL(url);
});

async function convertSelectedMarkdown(): Promise<void> {
  const markdownFile = markdownInput.files?.[0];
  if (!markdownFile) {
    setStatus("Markdown file is required.");
    return;
  }

  setStatus("Converting...");
  downloadButton.disabled = true;
  lastDocx = undefined;

  const markdown = await markdownFile.text();
  const imageAssets = await loadImageAssets(imageInput.files);
  const result = convertMarkdownToDocx(markdown, {
    inputPath: markdownFile.name,
    imageLoader: (path) => imageAssets.get(path) ?? imageAssets.get(basename(path))
  });

  lastDocx = result.docx;
  lastOutputName = outputName(markdownFile.name);
  summaryOutput.textContent = formatSummary(result.summary);
  downloadButton.disabled = false;
  setStatus(`Ready: ${lastOutputName}`);
}

async function loadImageAssets(files: FileList | null): Promise<Map<string, ImageAsset>> {
  const assets = new Map<string, ImageAsset>();
  if (!files) return assets;

  for (const file of Array.from(files)) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const path = file.webkitRelativePath || file.name;
    assets.set(path, { path, data: bytes });
    assets.set(file.name, { path: file.name, data: bytes });
  }
  return assets;
}

function outputName(inputName: string): string {
  return inputName.replace(/\.[^.]+$/, "") + ".docx";
}

function basename(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

function setStatus(message: string): void {
  statusOutput.textContent = message;
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }
  return element as T;
}
