import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@brand/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url)) },
  },
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // One in-memory MongoDB replica set for the run; every test file gets its own database.
    globalSetup: ["test/global-setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
