import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const docx2mdDir = path.resolve(rootDir, "workplace/miku-docx2md-devel");
const docx2mdCliPath = path.resolve(docx2mdDir, "scripts/miku-docx2md-cli.mjs");
const smokeDocxPath = path.resolve(rootDir, "workplace/smoke/miku-md2docx-smoke.docx");
const roundtripDir = path.resolve(rootDir, "workplace/roundtrip");
const roundtripMarkdownPath = path.resolve(roundtripDir, "miku-md2docx-roundtrip.md");
const roundtripSummaryPath = path.resolve(roundtripDir, "miku-md2docx-roundtrip.summary.txt");
const roundtripAssetsDir = path.resolve(roundtripDir, "assets");

async function main() {
  await assertDocx2mdRuntime();
  await fs.mkdir(roundtripDir, { recursive: true });

  await run(process.execPath, ["scripts/smoke-docx-fixture.mjs"], { cwd: rootDir });
  await run(process.execPath, [
    docx2mdCliPath,
    smokeDocxPath,
    "--out",
    roundtripMarkdownPath,
    "--summary-out",
    roundtripSummaryPath,
    "--assets-dir",
    roundtripAssetsDir
  ], { cwd: docx2mdDir });

  const markdown = await fs.readFile(roundtripMarkdownPath, "utf8");
  const summary = await fs.readFile(roundtripSummaryPath, "utf8");
  assertRoundtripMarkdown(markdown);
  assertRoundtripSummary(summary);

  process.stdout.write(`[smoke:roundtrip] wrote ${path.relative(rootDir, roundtripMarkdownPath)}\n`);
  process.stdout.write(`[smoke:roundtrip] wrote ${path.relative(rootDir, roundtripSummaryPath)}\n`);
}

async function assertDocx2mdRuntime() {
  if (!(await exists(docx2mdCliPath))) {
    throw new Error("miku-docx2md checkout is missing. Expected workplace/miku-docx2md-devel.");
  }
  if (!(await exists(path.resolve(docx2mdDir, "node_modules")))) {
    throw new Error("miku-docx2md dependencies are missing. Run `npm install` in workplace/miku-docx2md-devel before roundtrip smoke.");
  }
}

async function exists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function run(command, args, options) {
  const result = await execFileAsync(command, args, {
    ...options,
    encoding: "utf8"
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

function assertRoundtripMarkdown(markdown) {
  const checks = [
    ["top-level heading", /^# (?:\*\*)?Smoke Fixture(?:\*\*)?$/m],
    ["second-level heading", /^## (?:\*\*)?Inline Formatting(?:\*\*)?$/m],
    ["bold inline formatting", /\*\*bold\*\*/],
    ["italic inline formatting", /\*italic\*/],
    ["unordered list item", /^- Bullet item$/m],
    ["nested unordered list item", /^\s+- Nested bullet$/m],
    ["ordered list item", /^1\. Ordered item$/m],
    ["table header", /^\| (?:\*\*)?Feature(?:\*\*)? \| (?:\*\*)?Status(?:\*\*)? \|$/m],
    ["quote text", /This paragraph should use the Word Quote style\./],
    ["missing image fallback", /\[Missing image: Missing diagram\]/]
  ];

  for (const [label, pattern] of checks) {
    if (!pattern.test(markdown)) {
      throw new Error(`Roundtrip Markdown is missing expected ${label}.`);
    }
  }
}

function assertRoundtripSummary(summary) {
  const checks = [
    ["headings", /^headings: [1-9]\d*$/m],
    ["paragraphs", /^paragraphs: [1-9]\d*$/m],
    ["list items", /^listItems: [1-9]\d*$/m],
    ["tables", /^tables: [1-9]\d*$/m]
  ];

  for (const [label, pattern] of checks) {
    if (!pattern.test(summary)) {
      throw new Error(`Roundtrip summary is missing expected ${label} count.`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
