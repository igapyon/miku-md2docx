import { describe, expect, it } from "vitest";
import { convertMarkdownToDocx, formatSummary } from "../src/ts/core.ts";
import { expectXmlLines, normalizeXml, unzipStoredEntries, unzipTextEntries } from "./helpers/zip.js";

describe("convertMarkdownToDocx", () => {
  it("creates a DOCX zip containing core OOXML entries", () => {
    const result = convertMarkdownToDocx("# Title\n\nHello **world**.");
    const entries = unzipTextEntries(result.docx);
    expect([...entries.keys()]).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "docProps/app.xml",
      "docProps/core.xml",
      "word/_rels/document.xml.rels",
      "word/document.xml",
      "word/numbering.xml",
      "word/styles.xml"
    ]);
    expect(entries.get("word/document.xml")).toContain('<w:pStyle w:val="Heading1"/>');
    expect(entries.get("word/document.xml")).toContain('<w:t xml:space="preserve">Hello </w:t>');
    expect(entries.get("word/document.xml")).toContain("<w:b/>");
    expect(result.summary.headings).toBe(1);
    expect(result.summary.paragraphs).toBe(1);
  });

  it("matches golden OOXML lines for a representative document", () => {
    const markdown = [
      "# Alpha",
      "",
      "Plain **bold** and *italic* with `code`.",
      "",
      "## Alpha",
      "",
      "[Alpha link](#alpha) [missing link](#missing) [external](https://example.com/path?a=1&b=2)",
      "",
      "- task",
      "  - child",
      "",
      "| H1 | H2 |",
      "| --- | --- |",
      "| <ins>u</ins> | `c` |"
    ].join("\n");
    const result = convertMarkdownToDocx(markdown);
    const entries = unzipTextEntries(result.docx);
    const documentXml = normalizeXml(entries.get("word/document.xml"));
    const relsXml = normalizeXml(entries.get("word/_rels/document.xml.rels"));
    const stylesXml = normalizeXml(entries.get("word/styles.xml"));
    const numberingXml = normalizeXml(entries.get("word/numbering.xml"));

    expectXmlLines(documentXml, [
      '<w:pStyle w:val="Heading1"/>',
      '<w:bookmarkStart w:id="1" w:name="alpha"/>',
      '<w:pStyle w:val="Heading2"/>',
      '<w:bookmarkStart w:id="2" w:name="alpha-2"/>',
      '<w:rPr><w:b/></w:rPr>',
      '<w:rPr><w:i/></w:rPr>',
      '<w:rPr><w:rStyle w:val="CodeChar"/></w:rPr>',
      '<w:hyperlink w:anchor="alpha" w:history="1">',
      '<w:numId w:val="1"/>',
      '<w:tbl>',
      '<w:u w:val="single"/>'
    ]);
    expectXmlLines(relsXml, [
      '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
      '<Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>',
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com/path?a=1&amp;b=2" TargetMode="External"/>'
    ]);
    expectXmlLines(stylesXml, [
      '<w:style w:type="paragraph" w:styleId="Heading1">',
      '<w:style w:type="paragraph" w:styleId="Quote">',
      '<w:style w:type="character" w:styleId="CodeChar">'
    ]);
    expectXmlLines(numberingXml, [
      '<w:abstractNum w:abstractNumId="0">',
      '<w:abstractNum w:abstractNumId="1">',
      '<w:lvl w:ilvl="2">',
      '<w:numFmt w:val="bullet"/>',
      '<w:lvlText w:val="•"/>',
      '<w:multiLevelType w:val="hybridMultilevel"/>',
      '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:hint="default"/>',
      '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>',
      '<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>'
    ]);
    expect(result.summary.headings).toBe(2);
    expect(result.summary.unresolvedInternalLinks).toBe(1);
    expect(result.summary.tables).toBe(1);
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

  it("embeds GIF images with GIF content type and natural size", () => {
    const gif = new Uint8Array([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
      0x20, 0x00, 0x10, 0x00
    ]);
    const result = convertMarkdownToDocx("![Gif alt](media/sample.gif)", {
      imageLoader: () => ({ path: "media/sample.gif", data: gif })
    });
    const entries = unzipStoredEntries(result.docx);
    const contentTypesXml = new TextDecoder().decode(entries.get("[Content_Types].xml"));
    const documentXml = new TextDecoder().decode(entries.get("word/document.xml"));

    expect(entries.has("word/media/image-1.gif")).toBe(true);
    expect(contentTypesXml).toContain('Default Extension="gif" ContentType="image/gif"');
    expect(documentXml).toContain('cx="304800" cy="152400"');
    expect(result.summary.embeddedImages).toBe(1);
  });

  it("embeds JPEG and WebP images with matching package names and content types", () => {
    const jpeg = new Uint8Array([
      0xff, 0xd8,
      0xff, 0xc0, 0x00, 0x11, 0x08,
      0x00, 0x20, 0x00, 0x40, 0x00
    ]);
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    const result = convertMarkdownToDocx("![J](photo.jpeg)\n\n![W](asset.webp)", {
      imageLoader: (path) => path.endsWith(".jpeg")
        ? { path, data: jpeg }
        : { path, data: webp }
    });
    const entries = unzipStoredEntries(result.docx);
    const contentTypesXml = new TextDecoder().decode(entries.get("[Content_Types].xml"));
    const documentXml = new TextDecoder().decode(entries.get("word/document.xml"));

    expect(entries.has("word/media/image-1.jpeg")).toBe(true);
    expect(entries.has("word/media/image-2.webp")).toBe(true);
    expect(contentTypesXml).toContain('Default Extension="jpeg" ContentType="image/jpeg"');
    expect(contentTypesXml).toContain('Default Extension="webp" ContentType="image/webp"');
    expect(documentXml).toContain('cx="609600" cy="304800"');
    expect(result.summary.embeddedImages).toBe(2);
  });

  it("embeds unknown image extensions as octet-stream when bytes are supplied", () => {
    const result = convertMarkdownToDocx("![Binary](diagram.bin)", {
      imageLoader: () => ({ path: "diagram.bin", data: new Uint8Array([1, 2, 3, 4]) })
    });
    const entries = unzipStoredEntries(result.docx);
    const contentTypesXml = new TextDecoder().decode(entries.get("[Content_Types].xml"));

    expect(entries.has("word/media/image-1.bin")).toBe(true);
    expect(contentTypesXml).toContain('Default Extension="bin" ContentType="application/octet-stream"');
    expect(result.summary.embeddedImages).toBe(1);
  });

  it("does not download remote image URLs and records them as missing images", () => {
    const result = convertMarkdownToDocx("![Remote](https://example.com/image.png)");
    const entries = unzipTextEntries(result.docx);

    expect(entries.get("word/document.xml")).toContain("[Missing image: Remote]");
    expect(result.summary.images).toBe(1);
    expect(result.summary.missingImages).toBe(1);
    expect(result.summary.missingImageDetails).toEqual([
      { path: "https://example.com/image.png", alt: "Remote" }
    ]);
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

  it("handles supported raw HTML with uppercase tags and single-quoted attributes", () => {
    const markdown = "A <BR/> B <INS>u</INS> C <A class='x' href='https://example.com/u'>upper</A> D <IMG alt='Pic' src='missing-upper.png'>";
    const result = convertMarkdownToDocx(markdown);
    const entries = unzipTextEntries(result.docx);
    const documentXml = entries.get("word/document.xml");
    const relsXml = entries.get("word/_rels/document.xml.rels");

    expect(documentXml).toContain("<w:br/>");
    expect(documentXml).toContain('<w:u w:val="single"/>');
    expect(documentXml).toContain("<w:hyperlink r:id=");
    expect(documentXml).toContain("[Missing image: Pic]");
    expect(relsXml).toContain('Target="https://example.com/u" TargetMode="External"');
    expect(result.summary.unsupportedHtml).toBe(0);
    expect(result.summary.missingImages).toBe(1);
  });

  it("records unsupported raw HTML while preserving text fallback", () => {
    const markdown = "Before <span class=\"x\">inside</span> after\n\n<div><b>block</b></div>";
    const result = convertMarkdownToDocx(markdown);
    const entries = unzipTextEntries(result.docx);
    const documentXml = entries.get("word/document.xml");

    expect(documentXml).toContain("inside");
    expect(documentXml).toContain("block");
    expect(result.summary.unsupportedHtml).toBeGreaterThanOrEqual(2);
  });

  it("keeps complex Markdown summaries stable", () => {
    const markdown = [
      "---",
      "title: Complex",
      "---",
      "",
      "# Title",
      "",
      "> Quote",
      "",
      "1. one",
      "2. two",
      "",
      "---",
      "",
      "```",
      "line 1",
      "line 2",
      "```",
      "",
      "![No Alt](missing-a.png)",
      "![](missing-b.png)"
    ].join("\n");
    const result = convertMarkdownToDocx(markdown);

    expect(result.summary.frontMatter).toBe(true);
    expect(result.summary.headings).toBe(1);
    expect(result.summary.blockquotes).toBe(1);
    expect(result.summary.lists).toBe(1);
    expect(result.summary.listItems).toBe(2);
    expect(result.summary.horizontalRules).toBe(1);
    expect(result.summary.codeBlocks).toBe(1);
    expect(result.summary.images).toBe(2);
    expect(result.summary.missingImages).toBe(2);
    expect(result.summary.missingImageDetails).toEqual([
      { path: "missing-a.png", alt: "No Alt" },
      { path: "missing-b.png", alt: "" }
    ]);
  });
});
