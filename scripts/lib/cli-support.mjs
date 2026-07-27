import { dirname, resolve } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { convertMarkdownToDocx, formatSummary } from "../../dist/core.js";

const packageVersion = readPackageVersion();

class CliUsageError extends Error {}

export function isCliUsageError(error) {
  return error instanceof CliUsageError;
}

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
  const args = { input: undefined, out: undefined, template: undefined, summary: false, summaryOut: undefined, verbose: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help") return { help: true };
    if (arg === "--version") return { version: true };
    if (arg === "--out") {
      args.out = readOptionValue(argv, ++i, arg);
    } else if (arg === "--template") {
      args.template = readOptionValue(argv, ++i, arg);
    } else if (arg === "--summary") {
      args.summary = true;
    } else if (arg === "--summary-out") {
      args.summaryOut = readOptionValue(argv, ++i, arg);
    } else if (arg === "--verbose") {
      args.verbose = true;
    } else if (arg.startsWith("-")) {
      throw new CliUsageError(`Unknown option: ${arg}`);
    } else if (!args.input) {
      args.input = arg;
    } else {
      throw new CliUsageError(`Unexpected argument: ${arg}`);
    }
  }
  return args;
}

export function helpText() {
  return `miku-md2docx ${packageVersion}

Usage:
  node miku-md2docx-${packageVersion}.mjs <input.md> --out <output.docx>
  node miku-md2docx-${packageVersion}.mjs --help
  node miku-md2docx-${packageVersion}.mjs --version

Description:
  Convert one UTF-8 Markdown file to one editable Word .docx file locally.

Primary contract:
  stdout  Human-readable summary only with --summary; help and version text
  stderr  CLI usage errors, file or conversion failures, and --verbose progress
  file    The generated .docx; optional human-readable summary text file

Arguments:
  <input.md>            Markdown input file. Required for conversion.

Required options:
  --out <file>          DOCX output file. Required for conversion.

Options:
  --summary             Print conversion summary to stdout
  --summary-out <file>  Write conversion summary to file
  --template <docx>     Reuse compatible DOCX template package parts
  --verbose             Print progress diagnostics to stderr
  --help                Show this help
  --version             Show version

Inputs:
  <input.md> is read as UTF-8 Markdown. Local images are resolved relative to
  the input Markdown file.

Outputs:
  --out <file> is the generated editable Word .docx file. Summary output is
  written only when --summary or --summary-out is specified. Parent directories
  for --out and --summary-out are created automatically.

Overwrite behavior:
  Existing --out and --summary-out files are overwritten.

Generated artifacts:
  Conversion creates only the .docx given by --out and, when requested, the
  summary text file given by --summary-out. Repository dist/ and bundle/
  directories are development build artifacts, not conversion outputs.

Machine-readable output contract:
  The .docx file is the primary generated artifact. Summary output is
  human-readable text and is not a stable machine-readable API.

Diagnostics:
  CLI usage errors, file-system failures, conversion failures, and verbose
  progress are written to stderr.
  Missing images, remote image URLs, unresolved internal links, and unsupported
  HTML are reported in the summary without aborting conversion.

Exit codes:
  0  success, --help, or --version
  1  conversion or file-system failure
  2  invalid CLI usage, such as missing <input.md> or --out

Examples:
  node miku-md2docx-${packageVersion}.mjs README.md --out README.docx
  node miku-md2docx-${packageVersion}.mjs README.md --out README.docx --template template.docx
  node miku-md2docx-${packageVersion}.mjs README.md --out README.docx --summary
  node miku-md2docx-${packageVersion}.mjs README.md --out README.docx --summary-out reports/README.summary.txt

Template notes:
  Template mode replaces the template document body with generated Markdown
  content while preserving compatible package parts where practical.
  Template styles and section settings may carry over; numbering is regenerated.
  Existing template body paragraphs are not copied.
  Header and footer references are not carried over in the first cut.

Markdown handling notes:
  Remote image URLs are not downloaded.
  SVG images are not converted.
  Table alignment and merged cells are ignored.
`;
}

function readOptionValue(argv, index, option) {
  const value = argv[index];
  if (value === undefined || value.startsWith("--")) {
    throw new CliUsageError(`${option} requires a value.`);
  }
  return value;
}

function convertFile(args) {
  const inputPath = resolve(args.input);
  const outputPath = resolve(args.out);
  if (args.verbose) process.stderr.write(`verbose: reading ${args.input}\n`);
  const markdown = readFileSync(inputPath, "utf8");
  const result = convertMarkdownToDocx(markdown, {
    inputPath,
    templateDocx: args.template === undefined ? undefined : readFileSync(resolve(args.template)),
    imageLoader: (imagePath) => loadImage(inputPath, imagePath)
  });
  mkdirSync(dirname(outputPath), { recursive: true });
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
  if (args.summaryOut) {
    const summaryPath = resolve(args.summaryOut);
    mkdirSync(dirname(summaryPath), { recursive: true });
    writeFileSync(summaryPath, summary);
  }
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
