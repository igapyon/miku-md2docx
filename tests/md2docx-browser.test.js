import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("browser entry files", () => {
  it("wires the converter page to the generated browser bundle", () => {
    const html = readFileSync("miku-md2docx.html", "utf8");
    expect(html).toContain("id=\"markdownInput\"");
    expect(html).toContain("id=\"imageInput\"");
    expect(html).toContain("id=\"convertButton\"");
    expect(html).toContain("src=\"./src/js/main.js\"");
  });

  it("provides a landing page link to the converter", () => {
    const html = readFileSync("index.html", "utf8");
    expect(html).toContain("miku-md2docx.html");
  });
});
