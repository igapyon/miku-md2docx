# miku-md2docx

`miku-md2docx` is a local Markdown to `.docx` conversion tool.

The first design target is the opposite direction of `miku-docx2md`: convert Markdown document structure into editable Word document structure.

See [docs/md2docx-spec.md](./docs/md2docx-spec.md) for the current first-cut specification.

## Current Status

The current implementation is an early Node.js / TypeScript main app.

It can parse Markdown with `remark`, generate a minimal `.docx` package, run a CLI conversion for basic document structures, and provide a local browser UI.

Current first-cut support includes:

- paragraphs and headings
- bold, italic, strike, underline, inline code, and hard breaks
- external links and resolvable heading anchors
- bullet, numbered, nested, and task-list-like items
- Markdown tables with bold header rows
- fenced and indented code blocks
- blockquotes and horizontal rules
- local PNG, JPEG, GIF, and WebP image embedding
- missing-image fallback text and summary diagnostics
- limited raw HTML handling for `<br>`, `<ins>`, `<a>`, and `<img>`

Current limitations:

- raw HTML is not a general HTML-to-DOCX converter
- remote image URLs are not downloaded
- SVG conversion is not implemented
- Markdown table alignment and merged cells are ignored
- template `.docx` input is not supported
- generated `.docx` packages include explicit document relationships for styles and numbering
- generated `.docx` compatibility has automated ZIP / OOXML tests and a manual smoke fixture, but broader Word / LibreOffice compatibility review is still a follow-up item

## Usage

Install dependencies:

```bash
npm install
```

Build generated browser and runtime artifacts:

```bash
npm run build
```

Convert Markdown to DOCX:

```bash
npm run cli -- ./sample.md --out ./sample.docx
```

Use the browser UI:

```bash
npm run build
```

Then open `index.html` or `miku-md2docx.html` in a browser.

Show CLI help and version:

```bash
npm run cli -- --help
npm run cli -- --version
```

Run tests:

```bash
npm run test:unit
```

Run the full local verification set:

```bash
npm run build
npx tsc --noEmit
npm run test:unit
npm run smoke:docx
npm run build:bundle
npm run smoke:bundle
```

Build and smoke-test the CLI bundle:

```bash
npm run build:bundle
npm run smoke:bundle
```

Generate a manual DOCX compatibility smoke file:

```bash
npm run smoke:docx
```

This writes `workplace/smoke/miku-md2docx-smoke.docx` and `workplace/smoke/miku-md2docx-smoke.summary.txt`. Open the generated `.docx` in Microsoft Word and LibreOffice for manual compatibility review.

Release asset upload is handled by `.github/workflows/release-assets.yml` on `v*` tag pushes.

## Repository Operation

`workplace/` is a local scratch area for external checkouts, extracted archives, generated files, and verification artifacts.

Only `workplace/.gitkeep` is tracked. Other files under `workplace/` are intentionally ignored by Git.
