import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const bundlePath = "bundle/miku-md2docx.mjs";

async function runBundle(args) {
  return execFileAsync(process.execPath, [bundlePath, ...args], {
    encoding: "utf8"
  });
}

async function main() {
  const packageJson = JSON.parse(await fs.readFile("package.json", "utf8"));
  const expectedVersion = String(packageJson.version);
  const stat = await fs.stat(bundlePath);
  if (stat.size < 100) {
    throw new Error("CLI bundle file was unexpectedly small.");
  }

  const version = await runBundle(["--version"]);
  if (version.stdout.trim() !== expectedVersion) {
    throw new Error(`Unexpected bundle version output: ${version.stdout}`);
  }

  const help = await runBundle(["--help"]);
  if (!help.stdout.includes("Usage:") || !help.stdout.includes("miku-md2docx")) {
    throw new Error("Bundle help output did not include the expected usage text.");
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "miku-md2docx-bundle-"));
  const inputPath = path.join(tempDir, "sample.md");
  const outputPath = path.join(tempDir, "sample.docx");
  await fs.writeFile(inputPath, "# Bundle Smoke\n\nHello from bundle.\n", "utf8");
  const conversion = await runBundle([inputPath, "--out", outputPath, "--summary"]);
  if (!conversion.stdout.includes("headings: 1")) {
    throw new Error("Bundle conversion smoke output did not include expected summary.");
  }
  const outputStat = await fs.stat(outputPath);
  if (outputStat.size < 100) {
    throw new Error("Bundle conversion smoke output DOCX was unexpectedly small.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
