import { describe, it, expect } from "vitest";
import {
  MONITOR_SYSTEM_PROMPT,
  MONITOR_PROMPT_VERSION,
  MONITOR_MODEL_ID,
} from "./agent-config";

describe("monitoring/agent-config", () => {
  describe("MONITOR_SYSTEM_PROMPT", () => {
    it("is a non-empty string", () => {
      expect(typeof MONITOR_SYSTEM_PROMPT).toBe("string");
      expect(MONITOR_SYSTEM_PROMPT.length).toBeGreaterThan(0);
    });

    it("contains anti-injection instructions", () => {
      expect(MONITOR_SYSTEM_PROMPT).toContain("ANTI-INJECTION");
    });

    it("contains scoring guidelines", () => {
      expect(MONITOR_SYSTEM_PROMPT).toContain("SCORING REFERENCE");
    });

    it("contains risk flag criteria", () => {
      expect(MONITOR_SYSTEM_PROMPT).toContain("RISK FLAG CRITERIA");
    });
  });

  describe("MONITOR_PROMPT_VERSION", () => {
    it("matches semver format", () => {
      expect(MONITOR_PROMPT_VERSION).toMatch(
        /^v\d+\.\d+\.\d+$/
      );
    });
  });

  describe("MONITOR_MODEL_ID", () => {
    it("is a non-empty string", () => {
      expect(typeof MONITOR_MODEL_ID).toBe("string");
      expect(MONITOR_MODEL_ID.length).toBeGreaterThan(0);
    });

    it("contains a recognized model name", () => {
      expect(MONITOR_MODEL_ID).toMatch(
        /^(gpt-4|claude|gemini|o1|o3)/
      );
    });
  });
});
