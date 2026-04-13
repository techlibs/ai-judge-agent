const INJECTION_PATTERNS = [
  /SYSTEM:/i,
  /INSTRUCTION:/i,
  /IGNORE\s+(ALL\s+)?PREVIOUS/i,
  /OVERRIDE/i,
  /YOU\s+ARE\s+NOW/i,
  /FORGET\s+(ALL\s+)?INSTRUCTIONS/i,
  /ACT\s+AS/i,
  /DISREGARD/i,
  /NEW\s+ROLE/i,
  /ADMIN\s+MODE/i,
  /\[INST\]/i,
  /<\/s>/,
];

const MAX_EXTERNAL_DATA_LENGTH = 5000;

export function sanitizeExternalData(text: string): {
  sanitized: string;
  detectedPatterns: string[];
} {
  let sanitized = text;
  const detectedPatterns: string[] = [];

  // Strip control characters (keep newlines, tabs, carriage returns)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Detect and neutralize injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      detectedPatterns.push(pattern.source);
      sanitized = sanitized.replace(
        new RegExp(pattern.source, "gi"),
        "[FILTERED: injection pattern detected]"
      );
    }
  }

  // Truncate to prevent context overflow
  if (sanitized.length > MAX_EXTERNAL_DATA_LENGTH) {
    sanitized =
      sanitized.slice(0, MAX_EXTERNAL_DATA_LENGTH) + "\n[TRUNCATED]";
  }

  return { sanitized, detectedPatterns };
}

export function sanitizeColosseumResponse(fields: Record<string, unknown>): {
  sanitized: Record<string, unknown>;
  totalDetectedPatterns: string[];
} {
  const totalDetectedPatterns: string[] = [];

  function walkAndSanitize(value: unknown): unknown {
    if (typeof value === "string") {
      const { sanitized, detectedPatterns } = sanitizeExternalData(value);
      totalDetectedPatterns.push(...detectedPatterns);
      return sanitized;
    }
    if (Array.isArray(value)) {
      return value.map(walkAndSanitize);
    }
    if (value !== null && typeof value === "object") {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = walkAndSanitize(v);
      }
      return result;
    }
    return value;
  }

  const sanitized = walkAndSanitize(fields) as Record<string, unknown>;
  return { sanitized, totalDetectedPatterns };
}
