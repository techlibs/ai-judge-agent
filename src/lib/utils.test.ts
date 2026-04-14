import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges multiple class name strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes (falsy values)", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("handles undefined and null values", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("handles array inputs", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("handles object inputs (conditional map)", () => {
    expect(cn({ "text-red": true, "text-blue": false })).toBe("text-red");
  });

  it("deduplicates conflicting tailwind classes", () => {
    // twMerge resolves conflicts — last one wins
    expect(cn("px-4", "px-8")).toBe("px-8");
  });

  it("deduplicates conflicting color classes", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("merges responsive variants correctly", () => {
    expect(cn("md:px-4", "md:px-8")).toBe("md:px-8");
  });

  it("preserves non-conflicting tailwind classes", () => {
    expect(cn("px-4", "py-2", "text-sm")).toBe("px-4 py-2 text-sm");
  });

  it("handles empty inputs", () => {
    expect(cn()).toBe("");
    expect(cn("")).toBe("");
  });

  it("handles mixed input types", () => {
    const result = cn("base", ["array-class"], { conditional: true }, undefined);
    expect(result).toBe("base array-class conditional");
  });
});
