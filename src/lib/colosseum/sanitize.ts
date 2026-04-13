import type { ColosseumResponse } from "./schemas";

const MAX_STRING_LENGTH = 5000;
const MAX_ARRAY_ITEMS = 50;
const MAX_INSIGHTS = 20;

const CONTROL_CHAR_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+a/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /\bRESPOND\s+WITH\b/i,
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

function flagPromptInjectionAttempts(text: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

interface SanitizationResult {
  readonly data: ColosseumResponse;
  readonly injectionAttemptsDetected: number;
  readonly fieldsModified: ReadonlyArray<string>;
}

export function sanitizeColosseumResponse(
  raw: ColosseumResponse
): SanitizationResult {
  let injectionAttemptsDetected = 0;
  const fieldsModified: string[] = [];

  function trackSanitize(value: string, fieldName: string): string {
    if (flagPromptInjectionAttempts(value)) {
      injectionAttemptsDetected++;
      fieldsModified.push(fieldName);
    }
    const sanitized = sanitizeString(value);
    if (sanitized !== value) {
      fieldsModified.push(fieldName);
    }
    return sanitized;
  }

  const similarProjects = raw.similarProjects
    .slice(0, MAX_ARRAY_ITEMS)
    .map((project, idx) => ({
      name: trackSanitize(project.name, `similarProjects[${idx}].name`),
      hackathon: project.hackathon
        ? trackSanitize(
            project.hackathon,
            `similarProjects[${idx}].hackathon`
          )
        : undefined,
      year: project.year,
      status: project.status,
      techStack: project.techStack
        .slice(0, MAX_INSIGHTS)
        .map((t, ti) =>
          trackSanitize(t, `similarProjects[${idx}].techStack[${ti}]`)
        ),
      description: trackSanitize(
        project.description,
        `similarProjects[${idx}].description`
      ),
      accelerator: project.accelerator
        ? trackSanitize(
            project.accelerator,
            `similarProjects[${idx}].accelerator`
          )
        : undefined,
    }));

  const gapClassification = {
    type: raw.gapClassification.type,
    rationale: trackSanitize(
      raw.gapClassification.rationale,
      "gapClassification.rationale"
    ),
    existingCoverage: raw.gapClassification.existingCoverage
      ? trackSanitize(
          raw.gapClassification.existingCoverage,
          "gapClassification.existingCoverage"
        )
      : undefined,
    uncoveredSegment: raw.gapClassification.uncoveredSegment
      ? trackSanitize(
          raw.gapClassification.uncoveredSegment,
          "gapClassification.uncoveredSegment"
        )
      : undefined,
  };

  const archiveInsights = raw.archiveInsights
    .slice(0, MAX_ARRAY_ITEMS)
    .map((insight, idx) => ({
      source: trackSanitize(insight.source, `archiveInsights[${idx}].source`),
      insight: trackSanitize(
        insight.insight,
        `archiveInsights[${idx}].insight`
      ),
      relevance: trackSanitize(
        insight.relevance,
        `archiveInsights[${idx}].relevance`
      ),
    }));

  const keyInsights = raw.keyInsights
    .slice(0, MAX_INSIGHTS)
    .map((insight, idx) =>
      trackSanitize(insight, `keyInsights[${idx}]`)
    );

  const risks = raw.risks
    .slice(0, MAX_INSIGHTS)
    .map((risk, idx) => trackSanitize(risk, `risks[${idx}]`));

  const furtherReading = raw.furtherReading
    ? raw.furtherReading
        .slice(0, MAX_INSIGHTS)
        .map((url, idx) => trackSanitize(url, `furtherReading[${idx}]`))
    : undefined;

  return {
    data: {
      similarProjects,
      gapClassification,
      archiveInsights,
      competitorCount: raw.competitorCount,
      marketMaturity: raw.marketMaturity,
      estimatedTAM: raw.estimatedTAM
        ? trackSanitize(raw.estimatedTAM, "estimatedTAM")
        : null,
      keyInsights,
      risks,
      furtherReading,
    },
    injectionAttemptsDetected,
    fieldsModified: Array.from(new Set(fieldsModified)),
  };
}
