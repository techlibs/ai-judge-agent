import DOMPurify from "isomorphic-dompurify";

export function sanitizeDisplayText(untrusted: string): string {
  return DOMPurify.sanitize(untrusted, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

export function sanitizeRichText(untrusted: string): string {
  return DOMPurify.sanitize(untrusted, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "ul", "ol", "li", "h1", "h2", "h3", "a", "code", "pre"],
    ALLOWED_ATTR: ["href"],
    ALLOWED_URI_REGEXP: /^https?:\/\//i,
  });
}
