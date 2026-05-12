# miku-md2docx

`miku-md2docx` is a local Markdown to `.docx` conversion tool.

The first design target is the opposite direction of `miku-docx2md`: convert Markdown document structure into editable Word document structure.

See [docs/md2docx-spec.md](./docs/md2docx-spec.md) for the current first-cut specification.

## Current Status

The current implementation is an early Node.js / TypeScript main app.

It can parse Markdown with `remark`, generate a minimal `.docx` package, run a CLI conversion for basic document structures, and provide a local browser UI.

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

Build and smoke-test the CLI bundle:

```bash
npm run build:bundle
npm run smoke:bundle
```

Release asset upload is handled by `.github/workflows/release-assets.yml` on `v*` tag pushes.

## Repository Operation

`workplace/` is a local scratch area for external checkouts, extracted archives, generated files, and verification artifacts.

Only `workplace/.gitkeep` is tracked. Other files under `workplace/` are intentionally ignored by Git.
