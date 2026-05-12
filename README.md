# miku-md2docx

`miku-md2docx` is a local Markdown to `.docx` conversion tool.

The first design target is the opposite direction of `miku-docx2md`: convert Markdown document structure into editable Word document structure.

See [docs/md2docx-spec.md](./docs/md2docx-spec.md) for the current first-cut specification.

## Repository Operation

`workplace/` is a local scratch area for external checkouts, extracted archives, generated files, and verification artifacts.

Only `workplace/.gitkeep` is tracked. Other files under `workplace/` are intentionally ignored by Git.
