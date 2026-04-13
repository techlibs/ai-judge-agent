import { createHash } from "crypto";
import type { SanitizedProposal } from "./schemas";

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN =
  /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
const CPF_PATTERN = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g;
const IP_ADDRESS_PATTERN =
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

interface RawProposal {
  readonly title: string;
  readonly description: string;
  readonly budgetAmount: number;
  readonly budgetCurrency: string;
  readonly budgetBreakdown: ReadonlyArray<{
    readonly category: string;
    readonly amount: number;
    readonly description: string;
  }>;
  readonly technicalDescription: string;
  readonly teamMembers: ReadonlyArray<{
    readonly role: string;
    readonly experience: string;
  }>;
  readonly category: string;
}

function hashTeamProfile(
  teamMembers: ReadonlyArray<{ readonly role: string; readonly experience: string }>
): string {
  const normalized = teamMembers
    .map((m) => `${m.role}:${m.experience}`)
    .sort()
    .join("|");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

function redactEmails(text: string): string {
  return text.replace(EMAIL_PATTERN, "[EMAIL_REDACTED]");
}

function redactUrls(text: string): string {
  return text.replace(URL_PATTERN, "[URL_REDACTED]");
}

function redactPhones(text: string): string {
  return text.replace(PHONE_PATTERN, "[PHONE_REDACTED]");
}

function redactCpfs(text: string): string {
  return text.replace(CPF_PATTERN, "[CPF_REDACTED]");
}

function sanitizeText(text: string): string {
  let result = text;
  result = redactEmails(result);
  result = redactUrls(result);
  result = redactPhones(result);
  result = redactCpfs(result);
  return result;
}

function containsResidualPii(text: string): boolean {
  return (
    EMAIL_PATTERN.test(text) ||
    PHONE_PATTERN.test(text) ||
    CPF_PATTERN.test(text) ||
    IP_ADDRESS_PATTERN.test(text)
  );
}

class PiiDetectedError extends Error {
  constructor(field: string) {
    super(`Residual PII detected in field: ${field}`);
    this.name = "PiiDetectedError";
  }
}

function assertNoPii(value: string, fieldName: string): void {
  if (containsResidualPii(value)) {
    throw new PiiDetectedError(fieldName);
  }
}

export function sanitizeProposal(raw: RawProposal): SanitizedProposal {
  const title = sanitizeText(raw.title);
  const description = sanitizeText(raw.description);
  const technicalDescription = sanitizeText(raw.technicalDescription);
  const budgetBreakdown = raw.budgetBreakdown.map((item) => ({
    category: sanitizeText(item.category),
    amount: item.amount,
    description: sanitizeText(item.description),
  }));

  const teamProfileHash = hashTeamProfile(raw.teamMembers);
  const teamSize = raw.teamMembers.length;

  assertNoPii(title, "title");
  assertNoPii(description, "description");
  assertNoPii(technicalDescription, "technicalDescription");
  for (const item of budgetBreakdown) {
    assertNoPii(item.description, "budgetBreakdown.description");
  }

  return {
    title,
    description,
    budgetAmount: raw.budgetAmount,
    budgetCurrency: raw.budgetCurrency,
    budgetBreakdown,
    technicalDescription,
    teamSize,
    teamProfileHash,
    category: raw.category,
  };
}

export { PiiDetectedError };
