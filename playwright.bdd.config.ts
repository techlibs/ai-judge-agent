import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

const testDir = defineBddConfig({
  features: "e2e/features/**/*.feature",
  steps: "e2e/steps/**/*.ts",
});

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 0 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "on",
  },

  outputDir: "e2e/test-results",

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "bun run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
