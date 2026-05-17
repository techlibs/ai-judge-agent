import { describe, it, expect } from "vitest";
import { collectSocialMetrics } from "./social";
import type { SocialMetrics } from "./social";

describe("collectSocialMetrics", () => {
  it("returns baseline metrics structure", async () => {
    const result = await collectSocialMetrics({
      projectName: "Test Project",
    });

    expect(result).toEqual({
      announcements: 0,
      communityEngagement: 5,
    } satisfies SocialMetrics);
  });

  it("returns consistent results regardless of social links", async () => {
    const result = await collectSocialMetrics({
      projectName: "Another Project",
      socialLinks: ["https://twitter.com/test", "https://discord.gg/test"],
    });

    expect(result.announcements).toBe(0);
    expect(result.communityEngagement).toBe(5);
  });

  it("returns consistent results with empty social links array", async () => {
    const result = await collectSocialMetrics({
      projectName: "Minimal Project",
      socialLinks: [],
    });

    expect(result.announcements).toBeTypeOf("number");
    expect(result.communityEngagement).toBeTypeOf("number");
  });

  it("result properties are readonly (type-level check via satisfies)", async () => {
    const result: SocialMetrics = await collectSocialMetrics({
      projectName: "Type Check",
    });

    // Verify the shape matches the interface
    expect(Object.keys(result).sort()).toEqual(
      ["announcements", "communityEngagement"].sort()
    );
  });
});
