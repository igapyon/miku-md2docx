# md2docx Specification

## 1. Document Overview

`miku-md2docx` is a local tool that reads Markdown and generates an editable Word `.docx` document.

The design target is the opposite direction of the sibling reference project `miku-docx2md`.

The goal is:

```text
Markdown document structure -> Word document structure
```

The goal is not:

```text
Markdown visual rendering -> Word appearance reproduction
```

The first cut should preserve document structure that Markdown expresses naturally. It should not infer Word-specific layout information that is not present in the Markdown source.

## 2. Sibling Reference

The closest same-layer sister project inspected for this specification is:

- `workplace/miku-docx2md-devel`

Concrete decisions influenced by that project:

- local-first browser and CLI direction
- TypeScript-first source direction
- structure-first conversion policy
- summary and diagnostics as first-class output
- small, deterministic first-cut behavior
- explicit fallback behavior instead of visual fidelity promises

## 3. Supported Input and Output

### 3.1 Supported Input

- Markdown `.md`
- local image files referenced from Markdown image syntax

### 3.2 Primary Output

- one `.docx` file

### 3.3 Default Naming

The default output file name should be based on the input Markdown file name.

Example:

- input: `design.md`
- output: `design.docx`

## 4. Parser Policy

Markdown parsing should use `remark`.

Rationale:

- Markdown AST is explicit and suitable for specification-driven conversion.
- Block and inline structures can be mapped to WordprocessingML in a controlled way.
- The conversion can stay structure-oriented instead of renderer-oriented.

## 5. First-Cut Content Mapping

| Markdown | DOCX behavior |
| --- | --- |
| paragraph | Word paragraph |
| `#` through `######` | `Heading 1` through `Heading 6` |
| `**text**` | bold run |
| `*text*` | italic run |
| `~~text~~` | strike run |
| `<ins>text</ins>` | underline run |
| hard break | paragraph-internal Word line break |
| soft break | space |
| blank line | paragraph boundary |
| `[text](https://...)` | external hyperlink |
| `[text](#anchor)` | internal hyperlink when resolvable |
| `- item` | bullet list |
| `1. item` | numbered list |
| nested list | list level |
| Markdown table | Word table |
| fenced code block | monospace code paragraphs |
| indented code block | monospace code paragraphs |
| blockquote | `Quote` paragraph style |
| thematic break | horizontal-rule-like paragraph or plain separator fallback |
| task list | normal bullet list with `[ ]` or `[x]` text preserved |
| `![alt](path)` | embedded image |

## 6. HTML Policy

Raw HTML in Markdown is limited-support input.

Supported HTML:

- `<br>`
- `<ins>`
- `<a>`
- `<img>`

Other HTML should be converted to plain text when practical.

The summary should record unsupported HTML through `unsupportedHtml`.

The first cut should not attempt general HTML-to-DOCX conversion.

## 7. Tables

Markdown tables should become Word tables.

First-cut table behavior:

- header row is bold
- alignment markers such as `:---`, `---:`, and `:---:` are ignored
- inline formatting inside table cells is supported
- merged cells are not supported

The first cut should preserve table structure, not reproduce pixel layout.

## 8. Links and Anchors

External Markdown links should become Word hyperlinks.

Headings should receive generated bookmarks so Markdown internal links can resolve when possible.

Internal link behavior:

- `#anchor` links should become internal Word links when the target can be resolved.
- unresolved internal links should remain as normal text/link-like content rather than breaking conversion.
- summary should record unresolved internal links through `unresolvedInternalLinks`.

Anchor normalization should be stable and deterministic. A suitable first-cut normalization is:

1. trim whitespace
2. lowercase
3. collapse whitespace to `-`
4. replace unsupported punctuation with `-`
5. collapse repeated `-`

## 9. Front Matter

YAML front matter should not appear in the generated Word document in the first cut.

If front matter exists, the summary should record:

```text
frontMatter: true
```

Mapping `title`, `author`, and `subject` into DOCX document properties is a far-future TODO, not a first-cut feature.

## 10. Code Blocks

Fenced and indented code blocks are supported.

First-cut behavior:

- output as monospace paragraphs
- use minimal styling
- do not show the fenced language in the document body
- do not record the language in summary

Background color, borders, and advanced syntax highlighting are out of scope for the first cut.

## 11. Blockquotes

Blockquotes should use the Word paragraph style `Quote`.

Nested blockquotes may be flattened in the first cut.

## 12. Horizontal Rules

Thematic breaks should become a horizontal-rule-like Word paragraph when practical.

If that is too heavy for the first implementation, a plain separator paragraph is acceptable as a fallback.

## 13. Task Lists

Task-list items should be treated as normal bullet list items in the first cut.

The checkbox text is preserved literally:

- `[ ]`
- `[x]`

The first cut should not create interactive Word checkboxes.

## 14. Image Embedding

Markdown images should be embedded into the generated `.docx`.

Example:

```markdown
![Alt text](./images/example.png)
```

Expected DOCX package behavior:

- write the image bytes under `word/media/...`
- create an image relationship in `word/_rels/document.xml.rels`
- emit drawing markup in `word/document.xml`
- preserve alt text in drawing metadata when available

### 14.1 Supported Image Sources

The first cut supports local image files.

Markdown image paths are resolved relative to the input `.md` file.

Remote URL image download is out of scope for the first cut.

SVG support is out of scope for the first cut unless a later implementation chooses a safe conversion strategy.

### 14.2 Missing Images

If an image file does not exist:

- `.docx` generation continues
- the document body receives fallback text
- summary records the missing image

Fallback body text:

```text
[Missing image: Alt text]
```

If alt text is empty:

```text
[Missing image: path/to/image.png]
```

Summary fields should include:

```text
images: 3
embeddedImages: 2
missingImages: 1
resizedImages: 1
```

Detailed summary may include:

```text
missingImages:
- path: ./images/missing.png
  alt: Architecture diagram
  source: line 42
```

### 14.3 Image Sizing

Embedded images should fit within the document body width.

Sizing rules:

1. read the image natural pixel size
2. treat default DPI as 96
3. convert to DOCX EMU units
4. shrink only when the image would exceed the document body width
5. preserve aspect ratio
6. do not enlarge smaller images

Formula:

```text
displayWidth = min(imageNaturalWidthAt96Dpi, documentBodyWidth)
displayHeight = displayWidth * naturalHeight / naturalWidth
```

Markdown width and height extensions, HTML attributes, and CSS sizing are ignored in the first cut.

## 15. DOCX Package Generation

The first cut should generate a minimal DOCX package rather than depend on a template file.

Expected minimal entries:

```text
[Content_Types].xml
_rels/.rels
word/document.xml
word/_rels/document.xml.rels
word/styles.xml
word/numbering.xml
docProps/core.xml
docProps/app.xml
```

When images are embedded, include:

```text
word/media/...
```

The first cut uses built-in minimal `styles.xml`.

Template `.docx` support is a future option. `--template <file>` is intentionally postponed.

## 16. CLI

Minimum CLI behavior:

```bash
npm run cli -- ./sample.md --out ./sample.docx
npm run cli -- --help
npm run cli -- --version
```

Additional first-cut options:

```bash
--summary
--summary-out <file>
--debug
--verbose
```

Potential future option:

```bash
--strict
```

Default behavior is non-strict. Missing images and unresolved internal links should be reported in summary without aborting conversion.

The release-oriented local bundle path is:

```bash
npm run build:bundle
npm run smoke:bundle
```

Expected generated files:

```text
bundle/miku-md2docx.mjs
bundle/miku-md2docx-sources.tgz
```

GitHub Release asset upload is handled by `.github/workflows/release-assets.yml` on `v*` tag pushes.

## 17. Browser UI

The browser UI should follow the same local-first direction as the sibling project.

First-cut browser behavior:

- select or drop a Markdown file
- provide local image assets when needed
- generate `.docx` locally
- show summary
- download `.docx`
- optionally download summary

No selected local file should be uploaded to a remote service by default.

The current browser entrypoints are:

- `index.html`
- `miku-md2docx.html`

The browser runtime bundle is generated from `src/ts/main.ts` to `src/js/main.js`.

## 18. Summary and Diagnostics

The first cut should maintain a lightweight summary.

Recommended fields:

- `paragraphs`
- `headings`
- `links`
- `internalLinks`
- `externalLinks`
- `unresolvedInternalLinks`
- `lists`
- `listItems`
- `tables`
- `codeBlocks`
- `blockquotes`
- `horizontalRules`
- `images`
- `embeddedImages`
- `missingImages`
- `resizedImages`
- `frontMatter`
- `unsupportedHtml`

The summary should make conversion gaps visible without turning normal conversion into a hard failure.

## 19. Initial Implementation Priorities

Recommended implementation order:

1. project scaffold and build/test baseline
2. remark parser integration
3. minimal DOCX ZIP package generation
4. paragraphs and headings
5. inline formatting
6. links and heading bookmarks
7. lists and numbering
8. tables
9. image embedding and sizing
10. missing image fallback and summary
11. code blocks, blockquotes, horizontal rules, and task-list normalization
12. browser UI
13. CLI help, version, summary, and verbose output
