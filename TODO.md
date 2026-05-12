# TODO

## First Cut

- Scaffold TypeScript browser and CLI project structure.
- Use `remark` for Markdown parsing.
- Generate a minimal `.docx` package without requiring a template file.
- Implement paragraphs, headings, inline formatting, links, lists, tables, images, code blocks, blockquotes, horizontal rules, and summary output as described in `docs/md2docx-spec.md`.
- Add CLI support for `--help` and `--version`.

## Future

- Add optional template `.docx` support.
- Consider `--strict` for treating missing images and unresolved internal links as hard failures.
- Consider remote image handling only with explicit user action.
- Far future: map front matter fields such as `title`, `author`, and `subject` into DOCX document properties.
