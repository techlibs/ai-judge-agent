import { describe, it, expect } from "bun:test";
import { sanitizeDisplayText, sanitizeRichText } from "@/lib/sanitize-html";

describe("sanitizeDisplayText", () => {
  it("strips all HTML tags", () => {
    expect(sanitizeDisplayText('<script>alert("xss")</script>Hello')).toBe("Hello");
  });

  it("preserves plain text unchanged", () => {
    expect(sanitizeDisplayText("Hello world, this is plain text!")).toBe("Hello world, this is plain text!");
  });
});

describe("sanitizeRichText", () => {
  it("keeps allowed tags", () => {
    const input = "<p><strong>Bold</strong> and <em>italic</em></p>";
    expect(sanitizeRichText(input)).toBe(input);
  });

  it("strips dangerous tags and attributes", () => {
    const input = '<div onclick="alert(1)"><script>xss</script><p>Safe</p><iframe src="evil"></iframe></div>';
    expect(sanitizeRichText(input)).toBe("<p>Safe</p>");
  });
});
