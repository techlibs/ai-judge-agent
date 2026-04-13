/// <reference lib="dom" />
import { describe, test, expect } from "bun:test";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ScoreRadarChart, type DimensionScore } from "./score-radar-chart";

const SAMPLE_SCORES: ReadonlyArray<DimensionScore> = [
  { dimension: "technical", score: 80 },
  { dimension: "impact", score: 75 },
  { dimension: "cost", score: 60 },
  { dimension: "team", score: 90 },
];

describe("ScoreRadarChart", () => {
  test("renders the chart container with aria-label", () => {
    const { getByLabelText } = render(<ScoreRadarChart scores={SAMPLE_SCORES} />);
    const chart = getByLabelText(
      "Radar chart showing evaluation scores across four dimensions",
    );
    expect(chart).toBeInTheDocument();
  });

  test("renders with all four dimension scores", () => {
    const { container } = render(<ScoreRadarChart scores={SAMPLE_SCORES} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test("renders with empty scores without crashing", () => {
    const { container } = render(<ScoreRadarChart scores={[]} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test("renders with a single dimension score", () => {
    const singleScore: ReadonlyArray<DimensionScore> = [
      { dimension: "technical", score: 55 },
    ];
    const { container } = render(<ScoreRadarChart scores={singleScore} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test("renders with all zero scores", () => {
    const zeroScores: ReadonlyArray<DimensionScore> = [
      { dimension: "technical", score: 0 },
      { dimension: "impact", score: 0 },
      { dimension: "cost", score: 0 },
      { dimension: "team", score: 0 },
    ];
    const { container } = render(<ScoreRadarChart scores={zeroScores} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test("renders with max scores", () => {
    const maxScores: ReadonlyArray<DimensionScore> = [
      { dimension: "technical", score: 100 },
      { dimension: "impact", score: 100 },
      { dimension: "cost", score: 100 },
      { dimension: "team", score: 100 },
    ];
    const { container } = render(<ScoreRadarChart scores={maxScores} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test("applies min-h-[250px] class to chart container", () => {
    const { container } = render(<ScoreRadarChart scores={SAMPLE_SCORES} />);
    const chartEl = container.querySelector(".min-h-\\[250px\\]");
    expect(chartEl).toBeInTheDocument();
  });
});
