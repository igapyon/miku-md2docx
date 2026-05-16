import { dirname, resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { convertMarkdownToDocx, formatSummary } from "../../dist/core.js";

const packageVersion = readPackageVersion();

export function main(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(helpText());
    return;
  }
  if (args.version) {
    process.stdout.write(`${packageVersion}\n`);
    return;
  }
  if (!args.input || !args.out) {
    process.stderr.write(helpText());
    process.exitCode = 2;
    return;
  }

  convertFile(args);
}

export function parseArgs(argv) {
  const args = { input: undefined, out: undefined, summary: false, summaryOut: undefined, verbose: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help") return { help: true };
    if (arg === "--version") return { version: true };
    if (arg === "--out") {
      args.out = argv[++i];
    } else if (arg === "--summary") {
      args.summary = true;
    } else if (arg === "--summary-out") {
      args.summaryOut = argv[++i];
    } else if (arg === "--verbose") {
      args.verbose = true;
    } else if (!args.input) {
      args.input = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

export function helpText() {
  return `miku-md2docx ${packageVersion}

Usage:
  npm run cli -- <input.md> --out <output.docx>
  npm run cli -- --help
  npm run cli -- --version

Options:
  --out <file>          Write DOCX output to file
  --summary             Print conversion summary to stdout
  --summary-out <file>  Write conversion summary to file
  --verbose             Print progress diagnostics to stderr
  --help                Show this help
  --version             Show version
`;
}

function convertFile(args) {
  const inputPath = resolve(args.input);
  const outputPath = resolve(args.out);
  if (args.verbose) process.stderr.write(`verbose: reading ${args.input}\n`);
  const markdown = readFileSync(inputPath, "utf8");
  const result = convertMarkdownToDocx(markdown, {
    inputPath,
    imageLoader: (imagePath) => loadImage(inputPath, imagePath)
  });
  writeFileSync(outputPath, result.docx);
  if (args.verbose) process.stderr.write(`verbose: wrote ${args.out}\n`);
  writeSummaryOutputs(args, result);
}

function loadImage(inputPath, imagePath) {
  try {
    const resolved = resolve(dirname(inputPath), imagePath);
    return { path: imagePath, data: readFileSync(resolved) };
  } catch {
    return undefined;
  }
}

function writeSummaryOutputs(args, result) {
  const summary = formatSummary(result.summary);
  if (args.summary) process.stdout.write(summary);
  if (args.summaryOut) writeFileSync(resolve(args.summaryOut), summary);
}

function readPackageVersion() {
  if (typeof globalThis.__MIKU_MD2DOCX_VERSION === "string") {
    return globalThis.__MIKU_MD2DOCX_VERSION;
  }
  try {
    return JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")).version;
  } catch {
    return "0.0.0";
  }
}
