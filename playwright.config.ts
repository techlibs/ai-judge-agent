import { defineConfig, devices } from "@playwright/test";

const DEV_SERVER_PORT = 3000;
const BASE_URL = `http://localhost:${DEV_SERVER_PORT}`;

const TEST_TIMEOUT_MS = 30_000;
const NAVIGATION_TIMEOUT_MS = 60_000;
const WEB_SERVER_STARTUP_TIMEOUT_MS = 120_000;

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : undefined,
  reporter: "html",
  timeout: TEST_TIMEOUT_MS,

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    navigationTimeout: NAVIGATION_TIMEOUT_MS,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "bun run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env["CI"],
    timeout: WEB_SERVER_STARTUP_TIMEOUT_MS,
  },
});
