import { describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import packageJson from "../package.json" with { type: "json" };

describe("miku-md2docx CLI", () => {
  it("prints version and help", () => {
    expect(execFileSync("node", ["scripts/miku-md2docx-cli.mjs", "--version"], { encoding: "utf8" }).trim()).toBe(packageJson.version);
    const help = execFileSync("node", ["scripts/miku-md2docx-cli.mjs", "--help"], { encoding: "utf8" });
    expect(help).toContain("Usage:");
    expect(help).toContain(`node miku-md2docx-${packageJson.version}.mjs`);
    expect(help).toContain("Primary contract:");
    expect(help).toContain("Arguments:");
    expect(help).toContain("Required options:");
    expect(help).toContain("Outputs:");
    expect(help).toContain("Overwrite behavior:");
    expect(help).toContain("Generated artifacts:");
    expect(help).toContain("Machine-readable output contract:");
    expect(help).toContain("Diagnostics:");
    expect(help).toContain("Exit codes:");
    expect(help).toContain("--template <docx>");
    expect(help).toContain("Template styles and section settings may carry over");
    expect(help).toContain("Header and footer references are not carried over");
    expect(help).toContain("Local images are resolved relative to");
    expect(help).toContain("Parent directories");
    expect(help).toContain("human-readable text and is not a stable machine-readable API");
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

  it("creates output parent directories", () => {
    const dir = mkdtempSync(join(tmpdir(), "miku-md2docx-"));
    const input = join(dir, "sample.md");
    const output = join(dir, "generated", "docs", "sample.docx");
    const summaryOutput = join(dir, "generated", "reports", "sample.summary.txt");
    writeFileSync(input, "# Sample\n\nHello.");

    execFileSync("node", [
      "scripts/miku-md2docx-cli.mjs",
      input,
      "--out",
      output,
      "--summary-out",
      summaryOutput
    ]);

    expect(existsSync(output)).toBe(true);
    expect(readFileSync(summaryOutput, "utf8")).toContain("headings: 1");
  });

  it("uses exit code 2 for invalid CLI usage and code 1 for file failures", () => {
    const unknownOption = spawnSync("node", ["scripts/miku-md2docx-cli.mjs", "input.md", "--out", "output.docx", "--unknown"], {
      encoding: "utf8"
    });
    expect(unknownOption.status).toBe(2);
    expect(unknownOption.stderr).toContain("Unknown option: --unknown");
    expect(unknownOption.stdout).toBe("");

    const missingOptionValue = spawnSync("node", ["scripts/miku-md2docx-cli.mjs", "input.md", "--out"], {
      encoding: "utf8"
    });
    expect(missingOptionValue.status).toBe(2);
    expect(missingOptionValue.stderr).toContain("--out requires a value.");

    const missingInputFile = spawnSync("node", ["scripts/miku-md2docx-cli.mjs", "missing.md", "--out", "output.docx"], {
      encoding: "utf8"
    });
    expect(missingInputFile.status).toBe(1);
    expect(missingInputFile.stderr).not.toBe("");
  });
});
