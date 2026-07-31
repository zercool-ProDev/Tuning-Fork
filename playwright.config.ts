import { defineConfig } from "@playwright/test";

/**
 * Runs against an already-running server on :3000 with a database you are
 * happy to write to — the logging test creates and deletes real rows.
 *
 *   npm run build && npm run start   # with .env.local pointing at a test DB
 *   npm run e2e
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    },
  },
});
