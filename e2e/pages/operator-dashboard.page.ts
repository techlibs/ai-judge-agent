import { type Locator, type Page } from "@playwright/test";

const DASHBOARD_PATH = "/dashboard/operator";

export class OperatorDashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly systemStatusLabel: Locator;
  readonly operationalBadge: Locator;
  readonly submitTestProposalLink: Locator;
  readonly healthCheckLink: Locator;
  readonly networkTitle: Locator;
  readonly contractsBadge: Locator;
  readonly basescanLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Operator Dashboard" });
    this.systemStatusLabel = page.getByText("System Status");
    this.operationalBadge = page.getByText("Operational");
    this.submitTestProposalLink = page.getByRole("link", {
      name: "Submit Test Proposal",
    });
    this.healthCheckLink = page.getByRole("link", { name: "Health Check" });
    this.networkTitle = page.getByText("Base Sepolia");
    this.contractsBadge = page.getByText("6 contracts deployed");
    this.basescanLink = page.getByRole("link", { name: "View on Basescan" });
  }

  async goto() {
    await this.page.goto(DASHBOARD_PATH);
  }
}
