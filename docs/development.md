# Development Notes

This document collects developer-facing commands and repository operation notes
for `miku-md2docx`.

General user instructions are kept in [README.md](../README.md).

The project-local entry point for shared miku-soft maintenance references is
[miku-soft-reference.md](./miku-soft-reference.md).

## Current Development Status

The initial first-cut development is complete.

The current repository has:

- Markdown to DOCX conversion
- Node.js CLI
- automated tests
- manual DOCX smoke review in Microsoft Word and LibreOffice
- optional structural roundtrip smoke with `miku-docx2md`
- separated Web App repository at <https://github.com/igapyon/miku-md2docx-web>

See [TODO.md](../TODO.md) for follow-up decisions.

## Verification

Run unit tests:

```bash
npm run test:unit
```

Run the normal local verification set:

```bash
npm run build
npx tsc --noEmit
npm run test:unit
npm run smoke:docx
npm run build:bundle
npm run smoke:bundle
```

Generate the manual DOCX compatibility smoke file:

```bash
npm run smoke:docx
```

This writes:

- `workplace/smoke/miku-md2docx-smoke.docx`
- `workplace/smoke/miku-md2docx-smoke.summary.txt`

Run the optional structural roundtrip smoke with a local `miku-docx2md`
checkout:

```bash
npm run smoke:roundtrip
```

This expects `workplace/miku-docx2md-devel` to have its dependencies installed.
It writes the roundtripped Markdown and summary under `workplace/roundtrip/`.

## Release Bundle

Build and smoke-test the CLI/runtime release bundles:

```bash
npm run build:bundle
npm run smoke:bundle
npm run smoke:runtime
```

This generates:

- `bundle/miku-md2docx.mjs`
- `bundle/miku-md2docx-runtime.mjs`
- `bundle/miku-md2docx-sources.tgz`

Release asset upload is handled by
`.github/workflows/release-cli-runtime-bundles.yml` when a GitHub Release with
a `v*` tag is published.

## Vendored Runtime

This repository vendors `miku-ms-office-core` as a local ESM runtime artifact
under `src/vendor/`.

Current vendored version:

- `miku-ms-office-core` `v0.5.1`
- runtime: `src/vendor/miku-ms-office-core-0.5.1.mjs`
- source map: `src/vendor/miku-ms-office-core-0.5.1.mjs.map`
- local TypeScript declarations: `src/vendor/miku-ms-office-core-0.5.1.d.mts`

## Web App

The browser UI, Single-file Web App artifact, browser tests, and Web release
assets are maintained in the separated `miku-md2docx-web` repository.

This main application repository remains the owner of the product core, CLI,
summary and diagnostics vocabulary, and CLI runtime bundle.

## Repository Operation

`workplace/` is a local scratch area for external checkouts, extracted archives,
generated files, and verification artifacts.

Only `workplace/.gitkeep` is tracked. Other files under `workplace/` are
intentionally ignored by Git.

## Specification

See [md2docx-spec.md](./md2docx-spec.md) for the current conversion
specification.
