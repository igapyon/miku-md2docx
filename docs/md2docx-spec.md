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

List semantics are part of the first-cut contract. Unordered lists and task lists must be emitted as real DOCX list items, not as ordinary paragraphs with literal bullet characters. Compatibility fixes should improve the OOXML numbering definition rather than degrading list structure.

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

The current implementation treats supported HTML as a narrow convenience layer over Markdown AST nodes. Complex HTML parsing, CSS interpretation, nested arbitrary HTML, and browser-equivalent HTML rendering are out of scope.

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

They must remain DOCX list items. Do not convert task-list or unordered-list items into plain paragraphs with literal bullet characters as a compatibility workaround.

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

The current implementation supports local PNG, JPEG, GIF, and WebP package naming and content type declarations. Unknown image extensions may be embedded as `application/octet-stream` when bytes are supplied by the caller, but visual compatibility is not guaranteed.

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
remoteImages: 0
resizedImages: 1
```

Detailed summary may include:

```text
missingImageDetails:
- path: ./images/missing.png
  alt: Architecture diagram
  source: line 42
```

Remote image URLs are not downloaded. They are counted as missing images and
also recorded separately through `remoteImages` and `remoteImageDetails` so
callers can distinguish unavailable local files from intentionally unsupported
remote sources.

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

The default path generates a minimal DOCX package without requiring a template
file.

Expected minimal entries:

```text
[Content_Types].xml
_rels/.rels
word/document.xml
word/_rels/document.xml.rels
word/styles.xml
word/numbering.xml
word/settings.xml
docProps/core.xml
docProps/app.xml
```

`word/_rels/document.xml.rels` must include explicit relationships from the main document to `styles.xml`, `numbering.xml`, and `settings.xml`. Numbering definitions are not just loose package parts; list paragraphs depend on the numbering relationship being discoverable by Word-compatible readers.

`word/settings.xml` must set `w:compatSetting` named `compatibilityMode` to
`15`. This prevents the generated document from defaulting to the Word 2007
compatibility feature set when opened in current Microsoft Word versions.

When images are embedded, include:

```text
word/media/...
```

The first cut uses built-in minimal `styles.xml`.

### 15.1 Template Mode

`--template <file>` uses an existing `.docx` as the base package for generated
output.

Template mode is structural rather than pixel-perfect:

- generated Markdown content replaces the template document body
- existing body paragraphs in the template are not copied
- compatible package parts such as theme, settings, fonts, media, custom XML,
  and other non-document parts are preserved where practical
- the template section properties from `word/document.xml` are reused when
  present, so page size, orientation, and margins can carry over
- header and footer references inside template section properties are not
  carried over in the first cut
- template `word/styles.xml` is preserved and missing miku-required styles are
  appended
- `word/numbering.xml` is generated by `miku-md2docx` so bullet, numbered, and
  task lists keep the expected numbering IDs
- `word/document.xml` and `word/_rels/document.xml.rels` are regenerated

Template mode does not edit existing template paragraphs, perform Word layout
flow, or guarantee visual identity with the template. Unsupported or unusual
template package structures may need manual adjustment in Word.

## 16. CLI

Minimum CLI behavior:

```bash
npm run cli -- ./sample.md --out ./sample.docx
node scripts/miku-md2docx-cli.mjs ./sample.md --out ./sample.docx
npm run cli -- ./sample.md --out ./sample.docx --template ./template.docx
npm run cli -- --help
npm run cli -- --version
```

Additional first-cut options:

```bash
--summary
--summary-out <file>
--template <docx>
--debug
--verbose
```

Potential future option:

```bash
--strict
```

Default behavior is non-strict. Missing images and unresolved internal links should be reported in summary without aborting conversion.

Input behavior:

- `<input.md>` is read as UTF-8 Markdown.
- local image paths are resolved relative to the input Markdown file.

Output behavior:

- `--out <file>` is the generated editable Word `.docx` file.
- existing `--out` files are overwritten.
- `--summary` writes the conversion summary to stdout.
- `--summary-out <file>` writes the conversion summary to the given file and
  overwrites it when it already exists.
- normal conversion does not emit extra artifact files unless explicitly
  requested.

Diagnostics behavior:

- CLI usage errors and unexpected runtime errors are written to stderr.
- missing images, remote image URLs, unresolved internal links, and unsupported
  HTML are reported in the summary without aborting conversion.

Exit codes:

```text
0  success, --help, or --version
1  conversion or file-system failure
2  invalid CLI usage, such as missing <input.md> or --out
```

The release-oriented local bundle path is:

```bash
npm run build:bundle
npm run smoke:bundle
npm run smoke:runtime
```

Expected generated files:

```text
bundle/miku-md2docx.mjs
bundle/miku-md2docx-runtime.mjs
bundle/miku-md2docx-sources.tgz
```

GitHub Release asset upload is handled by
`.github/workflows/release-cli-runtime-bundles.yml` when a GitHub Release with
a `v*` tag is published.

## 17. Web App Surface

The browser UI is owned by the separated `miku-md2docx-web` repository.

This main application repository owns the product core, CLI, summary and
diagnostics vocabulary, and CLI runtime bundle. The Web App repository should
call or vendor the upstream runtime contract without redefining Markdown to
DOCX conversion semantics.

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
- `remoteImages`
- `resizedImages`
- `frontMatter`
- `unsupportedHtml`
- `missingImageDetails`
- `remoteImageDetails`

The summary should make conversion gaps visible without turning normal conversion into a hard failure.

`missingImageDetails` records the source path and alt text for each missing image when available. Source line numbers are not currently recorded.

`remoteImageDetails` records the URL and alt text for each remote image URL.
Remote images are also included in `missingImages` because no image bytes are
embedded in the generated DOCX.

## 19. Test and Verification Direction

Current automated verification includes:

- unit tests for DOCX ZIP package entries
- representative OOXML golden-fragment checks for `word/document.xml`, relationships, styles, and numbering
- image tests for missing images, embedded PNG/JPEG/GIF/WebP images, unknown extensions, remote image URLs, and resize behavior
- raw HTML tests for supported, unsupported, uppercase tag, single-quoted attribute, and reordered attribute cases
- CLI metadata and conversion tests
- browser entrypoint wiring tests

Local verification commands:

```bash
npm run build
npx tsc --noEmit
npm run test:unit
npm run smoke:docx
npm run build:bundle
npm run smoke:bundle
```

Manual compatibility review in Microsoft Word and LibreOffice remains a follow-up item.

## 20. Initial Implementation Priorities

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
12. CLI help, version, summary, and verbose output
13. template package reuse with `--template`
14. separated Web App surface in `miku-md2docx-web`
