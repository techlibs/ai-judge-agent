import { describe, test, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const COMPONENT_PATH = join(__dirname, "score-summary-card.tsx");
const source = readFileSync(COMPONENT_PATH, "utf-8");

describe("ScoreSummaryCard", () => {
  test("has 'use client' directive", () => {
    expect(source.startsWith('"use client"')).toBe(true);
  });

  test("exports ScoreSummaryCard function", () => {
    expect(source).toContain("export function ScoreSummaryCard");
  });

  test("shows loading state with Skeleton", () => {
    expect(source).toContain("Skeleton");
    expect(source).toContain("Evaluating...");
  });

  test("shows empty state with FileBarChart icon", () => {
    expect(source).toContain("FileBarChart");
    expect(source).toContain("No evaluation yet");
  });

  test("renders Evaluation Breakdown title", () => {
    expect(source).toContain("Evaluation Breakdown");
  });

  test("renders aggregate score in /100 format", () => {
    expect(source).toContain("/100");
  });

  test("renders Overall Score label", () => {
    expect(source).toContain("Overall Score");
  });

  test("shows all-zero scores message", () => {
    expect(source).toContain("All dimensions scored 0");
  });

  test("does not contain the string 'any'", () => {
    expect(source).not.toMatch(/\bany\b/);
  });

  test("renders dimension weight labels", () => {
    expect(source).toContain("Technical (25%)");
    expect(source).toContain("Impact (30%)");
    expect(source).toContain("Cost (20%)");
    expect(source).toContain("Team (25%)");
  });
});
