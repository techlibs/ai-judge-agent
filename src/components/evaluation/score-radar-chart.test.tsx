// TODO: Replace source-string-matching tests with @testing-library/react render tests
// once @testing-library/react is added as a dev dependency.
import { describe, test, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const COMPONENT_PATH = join(__dirname, "score-radar-chart.tsx");
const source = readFileSync(COMPONENT_PATH, "utf-8");

describe("ScoreRadarChart", () => {
  test("has 'use client' directive", () => {
    expect(source.startsWith('"use client"')).toBe(true);
  });

  test("exports DimensionScore interface", () => {
    expect(source).toContain("export interface DimensionScore");
  });

  test("exports ScoreRadarChart function", () => {
    expect(source).toContain("export function ScoreRadarChart");
  });

  test("maps all 4 dimension labels", () => {
    expect(source).toContain("technical");
    expect(source).toContain("impact");
    expect(source).toContain("cost");
    expect(source).toContain("team");
  });

  test("uses var(--chart-1) directly without hsl wrapper", () => {
    expect(source).toContain('var(--chart-1)');
    expect(source).not.toContain("hsl(var(--chart-1))");
  });

  test("has min-h-[250px] on ChartContainer", () => {
    expect(source).toContain("min-h-[250px]");
  });

  test("has aria-label on ChartContainer", () => {
    expect(source).toContain("aria-label");
  });

  test("checks prefers-reduced-motion", () => {
    expect(source).toContain("prefers-reduced-motion");
  });

  test("uses PolarAngleAxis for radar axes", () => {
    expect(source).toContain("PolarAngleAxis");
  });
});
