import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import packageJson from "../package.json" with { type: "json" };

describe("miku-md2docx CLI", () => {
  it("prints version and help", () => {
    expect(execFileSync("node", ["scripts/miku-md2docx-cli.mjs", "--version"], { encoding: "utf8" }).trim()).toBe(packageJson.version);
    const help = execFileSync("node", ["scripts/miku-md2docx-cli.mjs", "--help"], { encoding: "utf8" });
    expect(help).toContain("Usage:");
    expect(help).toContain("Arguments:");
    expect(help).toContain("Required options:");
    expect(help).toContain("Outputs:");
    expect(help).toContain("Overwrite behavior:");
    expect(help).toContain("Diagnostics:");
    expect(help).toContain("Exit codes:");
    expect(help).toContain("--template <docx>");
    expect(help).toContain("Template styles and section settings may carry over");
    expect(help).toContain("Header and footer references are not carried over");
    expect(help).toContain("Local images are resolved relative to");
    expect(help).toContain("2  invalid CLI usage");
  });

  it("converts a Markdown file to DOCX", () => {
    const dir = mkdtempSync(join(tmpdir(), "miku-md2docx-"));
    const input = join(dir, "sample.md");
    const output = join(dir, "sample.docx");
    const templateInput = join(dir, "template.md");
    const template = join(dir, "template.docx");
    const templatedOutput = join(dir, "sample-templated.docx");
    writeFileSync(input, "# Sample\n\nHello.");
    writeFileSync(templateInput, "# Template\n\nTemplate body.");
    execFileSync("node", ["scripts/miku-md2docx-cli.mjs", templateInput, "--out", template]);
    const summary = execFileSync("node", ["scripts/miku-md2docx-cli.mjs", input, "--out", output, "--summary"], { encoding: "utf8" });
    expect(summary).toContain("headings: 1");
    expect(readFileSync(output).length).toBeGreaterThan(100);
    execFileSync("node", ["scripts/miku-md2docx-cli.mjs", input, "--out", templatedOutput, "--template", template]);
    expect(readFileSync(templatedOutput).length).toBeGreaterThan(100);
  });
});
