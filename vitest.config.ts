import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    exclude: [
      "contracts/**",
      "node_modules/**",
      "e2e/**",
      ".worktrees/**",
    ],
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/ui/**", "src/**/*.d.ts"],
      reporter: ["text", "text-summary"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
