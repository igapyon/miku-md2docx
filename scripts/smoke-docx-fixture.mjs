import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const fixturePath = path.resolve(rootDir, "tests/fixtures/smoke.md");
const smokeDir = path.resolve(rootDir, "workplace/smoke");
const smokeImagesDir = path.resolve(smokeDir, "images");
const smokeMarkdownPath = path.resolve(smokeDir, "smoke.md");
const smokeDocxPath = path.resolve(smokeDir, "miku-md2docx-smoke.docx");
const smokeSummaryPath = path.resolve(smokeDir, "miku-md2docx-smoke.summary.txt");

async function main() {
  await fs.mkdir(smokeImagesDir, { recursive: true });
  await fs.copyFile(fixturePath, smokeMarkdownPath);
  await writeSmokeImages();

  const { stdout, stderr } = await execFileAsync("node", [
    "scripts/miku-md2docx-cli.mjs",
    smokeMarkdownPath,
    "--out",
    smokeDocxPath,
    "--summary",
    "--summary-out",
    smokeSummaryPath
  ], { cwd: rootDir });

  if (stderr) {
    process.stderr.write(stderr);
  }
  process.stdout.write(stdout);
  process.stdout.write(`[smoke:docx] wrote ${path.relative(rootDir, smokeDocxPath)}\n`);
  process.stdout.write(`[smoke:docx] wrote ${path.relative(rootDir, smokeSummaryPath)}\n`);
  process.stdout.write("[smoke:docx] Open the generated DOCX in Microsoft Word and LibreOffice for manual compatibility review.\n");
}

async function writeSmokeImages() {
  await fs.writeFile(path.resolve(smokeImagesDir, "smoke.png"), smokePng());
}

function smokePng() {
  const width = 96;
  const height = 48;
  const scanlines = [];
  for (let y = 0; y < height; y += 1) {
    scanlines.push(0);
    for (let x = 0; x < width; x += 1) {
      const inLeft = x < width / 2;
      scanlines.push(inLeft ? 0x2f : 0xf2);
      scanlines.push(inLeft ? 0x80 : 0xa4);
      scanlines.push(inLeft ? 0xed : 0x1d);
    }
  }
  return concatBytes(
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", concatBytes(uint32(width), uint32(height), Uint8Array.from([8, 2, 0, 0, 0]))),
    pngChunk("IDAT", deflateSync(Uint8Array.from(scanlines))),
    pngChunk("IEND", new Uint8Array())
  );
}

function pngChunk(type, data) {
  const typeBytes = new TextEncoder().encode(type);
  return concatBytes(uint32(data.length), typeBytes, data, uint32(crc32(concatBytes(typeBytes, data))));
}

function uint32(value) {
  return Uint8Array.from([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff
  ]);
}

function concatBytes(...parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

const crcTable = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
