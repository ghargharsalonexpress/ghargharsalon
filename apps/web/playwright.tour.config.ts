import { defineConfig, devices } from "@playwright/test";
import { API_PORT, WEB_PORT } from "./playwright.config";

const env = (extra: Record<string, string>): Record<string, string> => ({
  ...Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)),
  ...extra,
});

/**
 * npm run walkthrough: the happy path screen by screen for the client PDF (scripts/demo).
 * The same isolated stack as the E2E tests (web 5175, API 4100, in-memory database); the API
 * always starts fresh so the admin screens show only this booking. Not part of `npm run e2e`.
 */
export default defineConfig({
  testDir: "./e2e-tour",
  testMatch: "**/*.tour.mjs",
  workers: 1,
  retries: 0,
  timeout: 480_000,
  reporter: [["list"]],
  expect: { timeout: 15_000 },
  use: {
    ...(process.platform === "win32" ? { ...devices["Desktop Edge"], channel: "msedge" } : devices["Desktop Chrome"]),
    baseURL: `http://localhost:${WEB_PORT}`,
    // Off: writing traces on Windows races with the artifacts folder and fails the run
    // with ENOENT on a .trace file, which looks like a real failure and is not one.
    trace: "off",
    // A step that can't happen fails within a minute, naming the step, instead of at the test timeout.
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
  },
  webServer: [
    {
      command: "npm run e2e:server",
      cwd: "../api",
      url: `http://localhost:${API_PORT}/health/ready`,
      env: env({ E2E_WEB_ORIGIN: `http://localhost:${WEB_PORT}` }),
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}/styleguide`,
      env: env({ VITE_API_URL: `http://localhost:${API_PORT}`, E2E: "1" }),
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
