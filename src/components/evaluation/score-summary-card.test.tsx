/// <reference lib="dom" />
import { describe, test, expect } from "bun:test";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ScoreSummaryCard } from "./score-summary-card";
import type { DimensionScore } from "./score-radar-chart";

const SAMPLE_SCORES: ReadonlyArray<DimensionScore> = [
  { dimension: "technical", score: 80 },
  { dimension: "impact", score: 75 },
  { dimension: "cost", score: 60 },
  { dimension: "team", score: 90 },
];

describe("ScoreSummaryCard", () => {
  test("shows loading state with Evaluating... text", () => {
    const { getByText } = render(<ScoreSummaryCard loading={true} />);
    expect(getByText("Evaluating...")).toBeInTheDocument();
  });

  test("shows Evaluation Breakdown title in loading state", () => {
    const { getByText } = render(<ScoreSummaryCard loading={true} />);
    expect(getByText("Evaluation Breakdown")).toBeInTheDocument();
  });

  test("shows empty state when no scores provided", () => {
    const { getByText } = render(<ScoreSummaryCard />);
    expect(getByText("No evaluation yet")).toBeInTheDocument();
  });

  test("shows empty state when scores array is empty", () => {
    const { getByText } = render(<ScoreSummaryCard scores={[]} />);
    expect(getByText("No evaluation yet")).toBeInTheDocument();
  });

  test("renders Evaluation Breakdown title when scores are provided", () => {
    const { getByText } = render(
      <ScoreSummaryCard scores={SAMPLE_SCORES} aggregateScore={76} />,
    );
    expect(getByText("Evaluation Breakdown")).toBeInTheDocument();
  });

  test("renders aggregate score in /100 format", () => {
    const { getByText } = render(
      <ScoreSummaryCard scores={SAMPLE_SCORES} aggregateScore={76} />,
    );
    expect(getByText("76/100")).toBeInTheDocument();
  });

  test("renders Overall Score label", () => {
    const { getByText } = render(
      <ScoreSummaryCard scores={SAMPLE_SCORES} aggregateScore={76} />,
    );
    expect(getByText("Overall Score")).toBeInTheDocument();
  });

  test("shows N/A when aggregateScore is undefined but scores provided", () => {
    const { getByText } = render(<ScoreSummaryCard scores={SAMPLE_SCORES} />);
    expect(getByText("N/A")).toBeInTheDocument();
  });

  test("rounds aggregateScore before display", () => {
    const { getByText } = render(
      <ScoreSummaryCard scores={SAMPLE_SCORES} aggregateScore={76.7} />,
    );
    expect(getByText("77/100")).toBeInTheDocument();
  });

  test("shows all-zero scores message when all dimensions are 0", () => {
    const zeroScores: ReadonlyArray<DimensionScore> = [
      { dimension: "technical", score: 0 },
      { dimension: "impact", score: 0 },
      { dimension: "cost", score: 0 },
      { dimension: "team", score: 0 },
    ];
    const { getByText } = render(
      <ScoreSummaryCard scores={zeroScores} aggregateScore={0} />,
    );
    expect(getByText("All dimensions scored 0")).toBeInTheDocument();
  });

  test("does not show all-zero message when scores are non-zero", () => {
    const { queryByText } = render(
      <ScoreSummaryCard scores={SAMPLE_SCORES} aggregateScore={76} />,
    );
    expect(queryByText("All dimensions scored 0")).not.toBeInTheDocument();
  });

  test("renders dimension weight labels derived from DIMENSIONS constant", () => {
    const { getByText } = render(
      <ScoreSummaryCard scores={SAMPLE_SCORES} aggregateScore={76} />,
    );
    expect(getByText("Technical Feasibility (25%)")).toBeInTheDocument();
    expect(getByText("Impact Potential (30%)")).toBeInTheDocument();
    expect(getByText("Cost Efficiency (20%)")).toBeInTheDocument();
    expect(getByText("Team Capability (25%)")).toBeInTheDocument();
  });
});
