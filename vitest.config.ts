import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/e2e/**",
        "src/app/globals.css",
        "src/app/layout.tsx",
        "src/app/page.tsx",
        "src/app/grants/page.tsx",
        "src/app/grants/*/page.tsx",
        "src/app/grants/submit/form.tsx",
        "src/app/dashboard/**",
        "src/components/ui/**",
        "src/components/nav-bar.tsx",
        "src/components/error-boundary.tsx",
        "src/components/error-tracker.tsx",
      ],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
