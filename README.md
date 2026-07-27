# miku-md2docx

`miku-md2docx` converts Markdown files into editable Word `.docx` files.

It is a local tool. Your Markdown file and local images are processed on your
machine and are not uploaded to a server.

The conversion goal is document structure, not pixel-perfect Word layout.
Generated DOCX package entries use ZIP DEFLATE compression.

## What It Converts

Supported Markdown features include:

- paragraphs and headings
- bold, italic, strike, underline, inline code, and hard breaks
- external links and resolvable heading links
- bullet, numbered, nested, and task-list-like items
- Markdown tables
- fenced and indented code blocks
- blockquotes and horizontal rules
- local PNG, JPEG, GIF, and WebP images
- limited raw HTML: `<br>`, `<ins>`, `<a>`, and `<img>`

Known limitations:

- raw HTML is not fully converted
- remote image URLs are not downloaded
- SVG images are not converted
- table alignment and merged cells are ignored
- template `.docx` input is structural and best-effort; existing template body
  content is not copied

## Web App

The browser UI is maintained in the separated Web App repository:

- <https://github.com/igapyon/miku-md2docx-web>

This repository owns the Markdown to DOCX product core, CLI, and CLI release
bundle. The Web App repository owns browser UI files, Single-file Web App
generation, browser tests, and Web release assets.

## CLI Use

Download the versioned CLI asset from GitHub Releases, then run it directly:

```bash
node miku-md2docx-1.1.0.mjs ./sample.md --out ./sample.docx
```

The examples use the package version `1.1.0`. If a Release uses an additional
tag suffix, use the exact downloaded Asset name, such as
`miku-md2docx-1.1.0.2.mjs`; its `--help` and `--version` output include the
complete Release version.

The CLI creates missing parent directories for `--out` and `--summary-out`.
Existing output files are overwritten.

Use a Word template:

```bash
node miku-md2docx-1.1.0.mjs ./sample.md --out ./sample.docx --template ./template.docx
```

Show help or version:

```bash
node miku-md2docx-1.1.0.mjs --help
node miku-md2docx-1.1.0.mjs --version
```

For source-tree development, install dependencies once and use:

```bash
npm install
npm run cli -- ./sample.md --out ./sample.docx
npm run cli -- ./sample.md --out ./sample.docx --template ./template.docx
npm run cli -- --help
npm run cli -- --version
```

Template mode replaces the template document body with generated Markdown
content while preserving compatible package parts, styles, theme assets, and
section settings where practical. It is structural rather than pixel-perfect.

The generated `.docx` is the primary artifact. `--summary` writes
human-readable text to stdout, while `--summary-out <file>` writes the same
human-readable summary to a file. The summary is not a stable machine-readable
API. Usage errors, failures, and `--verbose` progress are written to stderr.
Normal conversion creates no repository build artifacts such as `dist/` or
`bundle/`.

## Current Status

The initial first-cut development is complete. See [TODO.md](./TODO.md) for
remaining follow-up decisions.

Developer notes are in [docs/development.md](./docs/development.md).

The project-local miku-soft reference entry point is
[docs/miku-soft-reference.md](./docs/miku-soft-reference.md).
