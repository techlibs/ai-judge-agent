import { type Locator, type Page } from "@playwright/test";

const GRANTS_PATH = "/grants";

export class GrantsListPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly emptyStateHeading: Locator;
  readonly emptyStateMessage: Locator;
  readonly submitProposalButton: Locator;
  readonly submitFirstProposalButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Grant Proposals" });
    this.emptyStateHeading = page.getByRole("heading", {
      name: "No proposals yet",
    });
    this.emptyStateMessage = page.getByText("Evaluated proposals will appear");
    this.submitProposalButton = page
      .getByRole("link", { name: "Submit Proposal" })
      .first();
    this.submitFirstProposalButton = page.getByRole("link", {
      name: "Submit Your First Proposal",
    });
  }

  async goto() {
    await this.page.goto(GRANTS_PATH);
  }
}
