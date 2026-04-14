import { type Locator, type Page } from "@playwright/test";

const HOME_PATH = "/";

export class HomePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly submitProposalLink: Locator;
  readonly viewProposalsLink: Locator;
  readonly operatorDashboardLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "IPE City Grants" });
    this.subtitle = page.getByText(
      "AI Judge System for Grant Proposal Evaluation"
    );
    this.submitProposalLink = page.getByRole("link", {
      name: "Submit Proposal",
    });
    this.viewProposalsLink = page.getByRole("link", {
      name: "View Proposals",
    });
    this.operatorDashboardLink = page.getByRole("link", {
      name: "Operator Dashboard",
    });
  }

  async goto() {
    await this.page.goto(HOME_PATH);
  }

  async clickSubmitProposal() {
    await this.submitProposalLink.click();
  }

  async clickViewProposals() {
    await this.viewProposalsLink.click();
  }

  async clickDashboard() {
    await this.operatorDashboardLink.click();
  }
}
