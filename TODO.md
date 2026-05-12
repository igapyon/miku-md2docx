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

## Future

- Add optional template `.docx` support.
- Consider `--strict` for treating missing images and unresolved internal links as hard failures.
- Consider remote image handling only with explicit user action.
- Far future: map front matter fields such as `title`, `author`, and `subject` into DOCX document properties.
