const MAX_STRING_LENGTH = 5000;
const MAX_ARRAY_ITEMS = 50;

const CONTROL_CHAR_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+a/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /\bRESPOND\s+WITH\b/i,
  /\bACT\s+AS\b/i,
  /\bFORGET\s+(ALL\s+)?PREVIOUS\b/i,
];

function stripControlCharacters(text: string): string {
  return text.replace(CONTROL_CHAR_PATTERN, "");
}

function truncateString(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength);
}

function sanitizeString(text: string): string {
  const cleaned = stripControlCharacters(text);
  return truncateString(cleaned, MAX_STRING_LENGTH);
}

export function detectPromptInjection(text: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

interface SanitizationResult<T> {
  readonly data: T;
  readonly injectionAttemptsDetected: number;
  readonly fieldsModified: ReadonlyArray<string>;
}

export function sanitizeProposalText(
  fields: Record<string, string>
): SanitizationResult<Record<string, string>> {
  let injectionAttemptsDetected = 0;
  const fieldsModified: string[] = [];
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (detectPromptInjection(value)) {
      injectionAttemptsDetected++;
      fieldsModified.push(key);
    }
    const clean = sanitizeString(value);
    if (clean !== value) {
      fieldsModified.push(key);
    }
    sanitized[key] = clean;
  }

  return {
    data: sanitized,
    injectionAttemptsDetected,
    fieldsModified: Array.from(new Set(fieldsModified)),
  };
}

export function sanitizeStringArray(
  items: ReadonlyArray<string>,
  fieldPrefix: string,
  maxItems: number = MAX_ARRAY_ITEMS
): SanitizationResult<ReadonlyArray<string>> {
  let injectionAttemptsDetected = 0;
  const fieldsModified: string[] = [];

  const sanitized = items.slice(0, maxItems).map((item, idx) => {
    const fieldName = `${fieldPrefix}[${idx}]`;
    if (detectPromptInjection(item)) {
      injectionAttemptsDetected++;
      fieldsModified.push(fieldName);
    }
    const clean = sanitizeString(item);
    if (clean !== item) {
      fieldsModified.push(fieldName);
    }
    return clean;
  });

  return {
    data: sanitized,
    injectionAttemptsDetected,
    fieldsModified: Array.from(new Set(fieldsModified)),
  };
}
