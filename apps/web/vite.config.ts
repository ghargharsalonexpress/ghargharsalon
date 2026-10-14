import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, searchForWorkspaceRoot } from "vite";

// packages/shared is linked by path until the npm-workspaces cutover (ADR-0018).
const shared = fileURLToPath(new URL("../../packages/shared", import.meta.url));

// Playwright's own dev server (port 5175) keeps a separate dependency cache and pre-bundles every
// page's dependencies at start, so a page that imports something new never reloads mid-test.
const e2e = process.env.E2E === "1";

// The legacy app runs on 5173; this app uses 5174 so both can run side by side.
export default defineConfig({
  plugins: [react()],
  ...(e2e ? { cacheDir: "node_modules/.vite-e2e", optimizeDeps: { entries: ["index.html", "src/**/*.tsx"], force: true } } : {}),
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@brand/shared": `${shared}/src/index.ts`,
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), shared] },
  },
  preview: { port: 4174, strictPort: true },
});
