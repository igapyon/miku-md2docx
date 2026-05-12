# TODO

## First Cut

- [x] Scaffold TypeScript and CLI project structure.
- [x] Use `remark` for Markdown parsing.
- [x] Generate a minimal `.docx` package without requiring a template file.
- [x] Add CLI support for `--help` and `--version`.
- [x] Add initial build, unit test, and CLI smoke path.
- [x] Add first-pass support for paragraphs, headings, inline formatting, links, lists, tables, images, code blocks, blockquotes, horizontal rules, and summary output.
- [x] Add browser UI.
- [x] Add stronger DOCX fixture/golden tests for generated XML parts.
- [x] Expand image tests for embedded images, missing images, and resized images.
- [x] Improve limited raw HTML handling for `<ins>`, `<a>`, and `<img>`.
- [x] Add release bundle build and smoke path when the CLI runtime shape stabilizes.
- [x] Add representative OOXML golden tests for document, relationships, styles, and numbering parts.
- [x] Add complex Markdown summary tests.
- [x] Add GIF image embedding test.
- [x] Add unsupported raw HTML fallback test.
- [x] Add JPEG, WebP, unknown-extension, and remote-image edge case tests.
- [x] Add raw HTML edge case tests for uppercase tags, single-quoted attributes, reordered attributes, and extra whitespace.
- [x] Add manual DOCX compatibility smoke fixture and generator.
- [x] Add explicit DOCX document relationships for `styles.xml` and `numbering.xml` so list numbering is loaded by Word-compatible readers.

## Remaining Follow-up

- [ ] Manually open generated `.docx` files in Microsoft Word and LibreOffice.
- [ ] Keep unordered and task lists as real DOCX list semantics; do not replace them with literal bullet characters as a compatibility workaround.
- [ ] Decide whether remote image URLs should be reported with a dedicated summary field.
- [ ] Decide whether OOXML golden checks should stay inline or move to fixture files as coverage grows.

## Future

- Add optional template `.docx` support.
- Consider `--strict` for treating missing images and unresolved internal links as hard failures.
- Consider remote image handling only with explicit user action.
- Far future: map front matter fields such as `title`, `author`, and `subject` into DOCX document properties.
