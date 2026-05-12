import { describe, expect, it } from "vitest";
import { convertMarkdownToDocx, formatSummary } from "../src/ts/core.ts";
import { unzipStoredEntries, unzipTextEntries } from "./helpers/zip.js";

describe("convertMarkdownToDocx", () => {
  it("creates a DOCX zip containing core OOXML entries", () => {
    const result = convertMarkdownToDocx("# Title\n\nHello **world**.");
    const entries = unzipTextEntries(result.docx);
    expect([...entries.keys()]).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "docProps/app.xml",
      "docProps/core.xml",
      "word/document.xml",
      "word/_rels/document.xml.rels",
      "word/styles.xml",
      "word/numbering.xml"
    ]);
    expect(entries.get("word/document.xml")).toContain('<w:pStyle w:val="Heading1"/>');
    expect(entries.get("word/document.xml")).toContain('<w:t xml:space="preserve">Hello </w:t>');
    expect(entries.get("word/document.xml")).toContain("<w:b/>");
    expect(result.summary.headings).toBe(1);
    expect(result.summary.paragraphs).toBe(1);
  });

  it("records missing images without aborting conversion", () => {
    const result = convertMarkdownToDocx("![Diagram](missing.png)");
    const entries = unzipTextEntries(result.docx);
    expect(entries.get("word/document.xml")).toContain("[Missing image: Diagram]");
    expect(entries.has("word/media/image-1.png")).toBe(false);
    expect(result.summary.images).toBe(1);
    expect(result.summary.embeddedImages).toBe(0);
    expect(result.summary.missingImages).toBe(1);
    expect(formatSummary(result.summary)).toContain("missingImages: 1");
  });

  it("embeds provided local image bytes", () => {
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x08
    ]);
    const result = convertMarkdownToDocx("![Small](small.png)", {
      imageLoader: () => ({ path: "small.png", data: png })
    });
    const entries = unzipStoredEntries(result.docx);
    const documentXml = new TextDecoder().decode(entries.get("word/document.xml"));
    const relsXml = new TextDecoder().decode(entries.get("word/_rels/document.xml.rels"));
    expect(entries.has("word/media/image-1.png")).toBe(true);
    expect(documentXml).toContain("descr=\"Small\"");
    expect(documentXml).toContain('cx="152400" cy="76200"');
    expect(relsXml).toContain('Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"');
    expect(relsXml).toContain('Target="media/image-1.png"');
    expect(result.summary.embeddedImages).toBe(1);
    expect(result.summary.missingImages).toBe(0);
  });

  it("shrinks large embedded images to document body width while preserving aspect ratio", () => {
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x03, 0xe8, 0x00, 0x00, 0x01, 0xf4
    ]);
    const result = convertMarkdownToDocx("![Large](large.png)", {
      imageLoader: () => ({ path: "large.png", data: png })
    });
    const entries = unzipTextEntries(result.docx);
    expect(entries.get("word/document.xml")).toContain('cx="5943600" cy="2971800"');
    expect(result.summary.resizedImages).toBe(1);
    expect(result.summary.embeddedImages).toBe(1);
  });

  it("renders representative OOXML for links, lists, tables, code blocks, and quotes", () => {
    const markdown = [
      "# Target",
      "",
      "See [target](#target) and [site](https://example.com).",
      "",
      "- first",
      "  1. nested",
      "",
      "| A | B |",
      "| --- | --- |",
      "| **x** | y |",
      "",
      "> quoted",
      "",
      "```js",
      "const value = 1;",
      "```"
    ].join("\n");
    const result = convertMarkdownToDocx(markdown);
    const entries = unzipTextEntries(result.docx);
    const documentXml = entries.get("word/document.xml");
    const relsXml = entries.get("word/_rels/document.xml.rels");

    expect(documentXml).toContain('<w:bookmarkStart w:id="1" w:name="target"/>');
    expect(documentXml).toContain('<w:hyperlink w:anchor="target"');
    expect(relsXml).toContain('Target="https://example.com" TargetMode="External"');
    expect(documentXml).toContain('<w:numId w:val="1"/>');
    expect(documentXml).toContain('<w:numId w:val="2"/>');
    expect(documentXml).toContain("<w:tbl>");
    expect(documentXml).toContain('<w:pStyle w:val="Quote"/>');
    expect(documentXml).toContain('<w:pStyle w:val="Code"/>');
    expect(result.summary.tables).toBe(1);
    expect(result.summary.blockquotes).toBe(1);
    expect(result.summary.codeBlocks).toBe(1);
  });

  it("handles supported split raw HTML inline nodes", () => {
    const markdown = 'A <ins>under</ins> B <br> C <a href="https://example.com">site</a> <img src="missing.png" alt="Missing">';
    const result = convertMarkdownToDocx(markdown);
    const entries = unzipTextEntries(result.docx);
    const documentXml = entries.get("word/document.xml");
    const relsXml = entries.get("word/_rels/document.xml.rels");

    expect(documentXml).toContain('<w:u w:val="single"/>');
    expect(documentXml).toContain("<w:br/>");
    expect(documentXml).toContain("<w:hyperlink r:id=");
    expect(documentXml).toContain("[Missing image: Missing]");
    expect(relsXml).toContain('Target="https://example.com" TargetMode="External"');
    expect(result.summary.unsupportedHtml).toBe(0);
    expect(result.summary.links).toBe(1);
    expect(result.summary.missingImages).toBe(1);
  });
});
