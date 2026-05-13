import { mkdir } from "node:fs/promises";
import { build } from "esbuild";

await mkdir("dist", { recursive: true });
await mkdir("src/js", { recursive: true });

await build({
  entryPoints: ["src/ts/main.ts"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: "src/js/main.js",
  sourcemap: false
});

await build({
  entryPoints: ["src/ts/core.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "es2022",
  outfile: "src/js/core.js",
  sourcemap: false
});

await build({
  entryPoints: ["src/ts/core.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "es2022",
  outfile: "dist/core.js",
  sourcemap: false
});
