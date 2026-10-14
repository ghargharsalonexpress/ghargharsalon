import { defineConfig } from "tsup";

// One ESM bundle per entry. Shared source and zod are bundled in (they live outside this
// package until the workspace cutover, ADR-0018); runtime dependencies come from package.json.
export default defineConfig({
  // Named entries keep the output flat: dist/index.js and dist/seed-admin.js.
  entry: { index: "src/index.ts", "seed-admin": "scripts/seed-admin.ts" },
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  sourcemap: true,
  clean: true,
  noExternal: ["@brand/shared", "zod"],
});
