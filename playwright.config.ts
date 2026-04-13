import { defineConfig, devices } from "@playwright/test";
import { resolve } from "path";
import { readFileSync } from "fs";

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

// Load env files into process.env (lower priority — won't override existing vars)
function loadEnvFile(path: string) {
  try {
    const content = readFileSync(path, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex);
      const value = trimmed.slice(eqIndex + 1);
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // env file is optional
  }
}

// Load .env.test first (test overrides), then .env.local (for integration tests needing real keys)
loadEnvFile(resolve(__dirname, ".env.test"));
loadEnvFile(resolve(__dirname, ".env.local"));

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }]],
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  outputDir: "e2e/test-results",

  projects: [
    {
      name: "api",
      testDir: "./e2e/api",
      use: {},
    },
    {
      name: "chromium",
      testDir: "./e2e",
      testIgnore: ["api/**", "integration/**"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "integration",
      testDir: "./e2e/integration",
      timeout: 120_000,
      use: {},
    },
  ],

  webServer: {
    command: `next dev --turbopack --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      ...process.env as Record<string, string>,
      // Override .env.local values — Next.js loads .env.local with higher priority,
      // so we must pass these explicitly to ensure test isolation
      TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ?? "file:./test.db",
      NEXT_PUBLIC_APP_URL: BASE_URL,
    },
  },
});
