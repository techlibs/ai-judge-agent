import { type Locator, type Page } from "@playwright/test";

const GRANT_DETAIL_BASE_PATH = "/grants";

export class GrantDetailPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly backToProposalsLink: Locator;
  readonly evaluationSubmittedBanner: Locator;
  readonly scoringDimensionsHeading: Locator;
  readonly proposalIdText: Locator;

  // Dimension cards
  readonly technicalFeasibilityCard: Locator;
  readonly impactPotentialCard: Locator;
  readonly costEfficiencyCard: Locator;
  readonly teamCapabilityCard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Proposal Evaluation" });
    this.backToProposalsLink = page.getByRole("link", {
      name: /Back to Proposals/,
    });
    this.evaluationSubmittedBanner = page.getByText("Evaluation Submitted");
    this.scoringDimensionsHeading = page.getByRole("heading", {
      name: "Scoring Dimensions",
    });
    this.proposalIdText = page.locator("code");

    this.technicalFeasibilityCard = page.getByText("Technical Feasibility");
    this.impactPotentialCard = page.getByText("Impact Potential");
    this.costEfficiencyCard = page.getByText("Cost Efficiency");
    this.teamCapabilityCard = page.getByText("Team Capability");
  }

  async goto(id: string) {
    await this.page.goto(`${GRANT_DETAIL_BASE_PATH}/${id}`);
  }
}
