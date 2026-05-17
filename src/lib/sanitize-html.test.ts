import { describe, it, expect } from "vitest";
import { sanitizeDisplayText, sanitizeRichText } from "@/lib/sanitize-html";

describe("sanitize-html", () => {
  describe("sanitizeDisplayText", () => {
    it("strips all HTML tags", () => {
      expect(sanitizeDisplayText("<p>Hello <b>world</b></p>")).toBe(
        "Hello world"
      );
    });

    it("strips script tags and their content", () => {
      expect(
        sanitizeDisplayText('<script>alert("xss")</script>Safe text')
      ).toBe("Safe text");
    });

    it("strips event handler attributes", () => {
      expect(
        sanitizeDisplayText('<div onclick="alert(1)">Click me</div>')
      ).toBe("Click me");
    });

    it("strips anchor tags", () => {
      expect(
        sanitizeDisplayText('<a href="https://evil.com">Link</a>')
      ).toBe("Link");
    });

    it("handles empty string", () => {
      expect(sanitizeDisplayText("")).toBe("");
    });

    it("returns plain text unchanged", () => {
      expect(sanitizeDisplayText("Just plain text")).toBe("Just plain text");
    });

    it("strips nested malicious HTML", () => {
      const malicious =
        '<div><img src=x onerror="alert(1)"><script>document.cookie</script></div>';
      const result = sanitizeDisplayText(malicious);
      expect(result).not.toContain("<script");
      expect(result).not.toContain("onerror");
      expect(result).not.toContain("<img");
      expect(result).not.toContain("<div");
    });

    it("strips style tags", () => {
      expect(
        sanitizeDisplayText("<style>body{display:none}</style>Visible")
      ).toBe("Visible");
    });

    it("strips iframe tags", () => {
      expect(
        sanitizeDisplayText('<iframe src="https://evil.com"></iframe>Content')
      ).toBe("Content");
    });
  });

  describe("sanitizeRichText", () => {
    it("allows safe formatting tags", () => {
      expect(sanitizeRichText("<b>bold</b>")).toBe("<b>bold</b>");
      expect(sanitizeRichText("<i>italic</i>")).toBe("<i>italic</i>");
      expect(sanitizeRichText("<em>emphasis</em>")).toBe("<em>emphasis</em>");
      expect(sanitizeRichText("<strong>strong</strong>")).toBe(
        "<strong>strong</strong>"
      );
    });

    it("allows paragraph and line break tags", () => {
      expect(sanitizeRichText("<p>Paragraph</p>")).toBe("<p>Paragraph</p>");
      expect(sanitizeRichText("Line 1<br>Line 2")).toBe("Line 1<br>Line 2");
    });

    it("allows list tags", () => {
      const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
      expect(sanitizeRichText(html)).toBe(html);

      const ordered = "<ol><li>First</li><li>Second</li></ol>";
      expect(sanitizeRichText(ordered)).toBe(ordered);
    });

    it("allows heading tags", () => {
      expect(sanitizeRichText("<h1>Title</h1>")).toBe("<h1>Title</h1>");
      expect(sanitizeRichText("<h2>Subtitle</h2>")).toBe("<h2>Subtitle</h2>");
      expect(sanitizeRichText("<h3>Section</h3>")).toBe("<h3>Section</h3>");
      expect(sanitizeRichText("<h4>Sub</h4>")).toBe("<h4>Sub</h4>");
      expect(sanitizeRichText("<h5>Minor</h5>")).toBe("<h5>Minor</h5>");
      expect(sanitizeRichText("<h6>Smallest</h6>")).toBe("<h6>Smallest</h6>");
    });

    it("allows blockquote, code, and pre tags", () => {
      expect(sanitizeRichText("<blockquote>Quote</blockquote>")).toBe(
        "<blockquote>Quote</blockquote>"
      );
      expect(sanitizeRichText("<code>const x = 1;</code>")).toBe(
        "<code>const x = 1;</code>"
      );
      expect(sanitizeRichText("<pre>preformatted</pre>")).toBe(
        "<pre>preformatted</pre>"
      );
    });

    it("allows anchor tags with safe attributes", () => {
      const html =
        '<a href="https://example.com" target="_blank" rel="noopener">Link</a>';
      expect(sanitizeRichText(html)).toBe(html);
    });

    it("strips unsafe attributes from allowed tags", () => {
      const result = sanitizeRichText(
        '<a href="https://example.com" onclick="alert(1)">Link</a>'
      );
      expect(result).toContain("href");
      expect(result).not.toContain("onclick");
    });

    it("strips script tags", () => {
      expect(
        sanitizeRichText('<p>Safe</p><script>alert("xss")</script>')
      ).toBe("<p>Safe</p>");
    });

    it("strips event handlers from tags", () => {
      const result = sanitizeRichText(
        '<p onmouseover="steal()">Hover me</p>'
      );
      expect(result).toBe("<p>Hover me</p>");
    });

    it("strips div and span tags (not in safe list)", () => {
      expect(sanitizeRichText("<div>Content</div>")).toBe("Content");
      expect(sanitizeRichText("<span>Text</span>")).toBe("Text");
    });

    it("strips img tags", () => {
      const result = sanitizeRichText(
        '<img src="x" onerror="alert(1)">'
      );
      expect(result).not.toContain("<img");
      expect(result).not.toContain("onerror");
    });

    it("strips iframe tags", () => {
      expect(
        sanitizeRichText('<iframe src="https://evil.com"></iframe>')
      ).toBe("");
    });

    it("handles empty string", () => {
      expect(sanitizeRichText("")).toBe("");
    });

    it("handles nested malicious HTML within allowed tags", () => {
      const malicious =
        '<p><b>Bold <script>alert(1)</script> text</b></p>';
      const result = sanitizeRichText(malicious);
      expect(result).toContain("<p>");
      expect(result).toContain("<b>");
      expect(result).not.toContain("<script");
    });

    it("strips style attribute from allowed tags", () => {
      const result = sanitizeRichText(
        '<p style="color:red">Colored</p>'
      );
      expect(result).not.toContain("style");
      expect(result).toBe("<p>Colored</p>");
    });
  });
});
