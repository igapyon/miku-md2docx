# miku-md2docx

`miku-md2docx` converts Markdown files into editable Word `.docx` files.

It is a local tool. Your Markdown file and local images are processed on your
machine and are not uploaded to a server.

The conversion goal is document structure, not pixel-perfect Word layout.

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
- template `.docx` input is not supported

## Web App

The browser UI is maintained in the separated Web App repository:

- <https://github.com/igapyon/miku-md2docx-web>

This repository owns the Markdown to DOCX product core, CLI, and CLI release
bundle. The Web App repository owns browser UI files, Single-file Web App
generation, browser tests, and Web release assets.

## CLI Use

Install dependencies once:

```bash
npm install
```

Convert a Markdown file:

```bash
npm run cli -- ./sample.md --out ./sample.docx
```

Show help or version:

```bash
npm run cli -- --help
npm run cli -- --version
```

## Current Status

The initial first-cut development is complete. See [TODO.md](./TODO.md) for
remaining follow-up decisions.

Developer notes are in [docs/development.md](./docs/development.md).
