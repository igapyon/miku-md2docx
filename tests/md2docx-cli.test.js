import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

describe("miku-md2docx CLI", () => {
  it("prints version and help", () => {
    expect(execFileSync("node", ["scripts/miku-md2docx-cli.mjs", "--version"], { encoding: "utf8" })).toMatch(/0\.5\.0/);
    expect(execFileSync("node", ["scripts/miku-md2docx-cli.mjs", "--help"], { encoding: "utf8" })).toContain("Usage:");
  });

  it("converts a Markdown file to DOCX", () => {
    const dir = mkdtempSync(join(tmpdir(), "miku-md2docx-"));
    const input = join(dir, "sample.md");
    const output = join(dir, "sample.docx");
    writeFileSync(input, "# Sample\n\nHello.");
    const summary = execFileSync("node", ["scripts/miku-md2docx-cli.mjs", input, "--out", output, "--summary"], { encoding: "utf8" });
    expect(summary).toContain("headings: 1");
    expect(readFileSync(output).length).toBeGreaterThan(100);
  });
});
