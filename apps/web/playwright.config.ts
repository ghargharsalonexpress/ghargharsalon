import { defineConfig, devices } from "@playwright/test";

/** Own ports, so a running dev server (5174) and API (4000) are never touched by tests. */
export const WEB_PORT = 5175;
export const API_PORT = 4100;
const isCI = Boolean(process.env.CI);

const env = (extra: Record<string, string>): Record<string, string> => ({
  ...Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)),
  ...extra,
});

/**
 * E2E, accessibility and visual tests (plan C17).
 * Windows dev machines use the installed Edge; CI (Linux) uses Playwright's Chromium.
 * Snapshots are stored per platform because font rendering differs between them.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  snapshotPathTemplate: "{testDir}/__screenshots__/{platform}/{testFilePath}/{arg}{ext}",
  expect: {
    // Full-page captures of the style guide are tall (up to ~25,000px at 360px), so allow time to settle.
    timeout: 15_000,
    toHaveScreenshot: { animations: "disabled", caret: "hide", scale: "css" },
  },
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: process.platform === "win32" ? { ...devices["Desktop Edge"], channel: "msedge" } : { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      // In-memory MongoDB, emails kept in memory, seeded admin and professional (apps/api/scripts/e2e-server.ts).
      command: "npm run e2e:server",
      cwd: "../api",
      url: `http://localhost:${API_PORT}/health/ready`,
      env: env({ E2E_WEB_ORIGIN: `http://localhost:${WEB_PORT}` }),
      reuseExistingServer: !isCI,
      timeout: 180_000,
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}/styleguide`,
      // No outside form in tests (an .env.local may set one): the Join page offers email instead.
      env: env({ VITE_API_URL: `http://localhost:${API_PORT}`, VITE_PRO_FORM_URL: "", E2E: "1" }),
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
  ],
});
