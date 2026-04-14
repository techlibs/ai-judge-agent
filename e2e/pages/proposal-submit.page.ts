import { type Locator, type Page } from "@playwright/test";

const SUBMIT_PATH = "/grants/submit";

export class ProposalSubmitPage {
  readonly page: Page;
  readonly heading: Locator;

  // Form fields — match labels and IDs from src/app/grants/submit/form.tsx
  readonly titleInput: Locator;
  readonly categorySelect: Locator;
  readonly descriptionTextarea: Locator;
  readonly problemStatementTextarea: Locator;
  readonly proposedSolutionTextarea: Locator;
  readonly budgetAmountInput: Locator;
  readonly budgetBreakdownTextarea: Locator;
  readonly timelineTextarea: Locator;
  readonly residencyDurationSelect: Locator;
  readonly demoDayDeliverableTextarea: Locator;
  readonly communityContributionTextarea: Locator;
  readonly priorParticipationCheckbox: Locator;

  // Team member controls
  readonly addTeamMemberButton: Locator;

  // Links controls
  readonly addLinkButton: Locator;

  // Submit
  readonly submitButton: Locator;

  // Success state
  readonly successMessage: Locator;
  readonly viewResultsLink: Locator;

  // Validation errors
  readonly validationErrors: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", {
      name: "Submit a Grant Proposal",
    });

    // Form fields by label text
    this.titleInput = page.getByLabel("Proposal Title");
    this.categorySelect = page.getByLabel("Category");
    this.descriptionTextarea = page.getByLabel("Description");
    this.problemStatementTextarea = page.getByLabel("Problem Statement");
    this.proposedSolutionTextarea = page.getByLabel("Proposed Solution");
    this.budgetAmountInput = page.getByLabel("Budget Amount (USDC)");
    this.budgetBreakdownTextarea = page.getByLabel("Budget Breakdown");
    this.timelineTextarea = page.getByLabel("Timeline");
    this.residencyDurationSelect = page.getByLabel(
      "IPE Village Residency Duration"
    );
    this.demoDayDeliverableTextarea = page.getByLabel("Demo Day Deliverable");
    this.communityContributionTextarea =
      page.getByLabel("Community Contribution");
    this.priorParticipationCheckbox = page.getByRole("checkbox", {
      name: /previously participated/,
    });

    this.addTeamMemberButton = page.getByRole("button", {
      name: "+ Add Member",
    });
    this.addLinkButton = page.getByRole("button", { name: "+ Add Link" });
    this.submitButton = page.getByRole("button", {
      name: "Submit Proposal for Evaluation",
    });

    this.successMessage = page.getByText("Proposal Submitted Successfully");
    this.viewResultsLink = page.getByRole("link", {
      name: "View Evaluation Results",
    });

    this.validationErrors = page.locator(".text-red-600");
  }

  async goto() {
    await this.page.goto(SUBMIT_PATH);
  }

  async fillTitle(title: string) {
    await this.titleInput.fill(title);
  }

  async fillDescription(description: string) {
    await this.descriptionTextarea.fill(description);
  }

  async fillCategory(category: string) {
    await this.categorySelect.selectOption(category);
  }

  async fillBudget(amount: number) {
    await this.budgetAmountInput.fill(String(amount));
  }

  async addTeamMember(name: string, role: string) {
    // Find the last empty team member fields
    const nameInputs = this.page.locator('input[id^="team-name-"]');
    const roleInputs = this.page.locator('input[id^="team-role-"]');
    const count = await nameInputs.count();

    // Fill the last one (most recently added)
    const lastNameInput = nameInputs.nth(count - 1);
    const lastRoleInput = roleInputs.nth(count - 1);

    await lastNameInput.fill(name);
    await lastRoleInput.fill(role);
  }

  async removeTeamMember(index: number) {
    const removeButtons = this.page.getByRole("button", { name: "Remove" });
    await removeButtons.nth(index).click();
  }

  async submitForm() {
    await this.submitButton.click();
  }

  /**
   * Fill all required fields with valid data for a complete submission.
   * Uses realistic proposal data that passes all Zod validations.
   */
  async fillAllRequired() {
    await this.fillTitle(
      "Decentralized Water Monitoring Infrastructure for IPE Village"
    );
    await this.fillCategory("infrastructure");
    await this.fillDescription(
      "This proposal establishes a sensor network across the IPE Village water system to provide real-time quality monitoring, leak detection, and usage analytics. The infrastructure combines low-cost IoT sensors with on-chain data attestation."
    );
    await this.page
      .getByLabel("Problem Statement")
      .fill(
        "IPE Village currently lacks real-time visibility into water quality and distribution efficiency."
      );
    await this.page
      .getByLabel("Proposed Solution")
      .fill(
        "Deploy 25 IoT sensor nodes across the village water network measuring pH, turbidity, flow rate, and temperature."
      );
    await this.fillBudget(45000);
    await this.page
      .getByLabel("Budget Breakdown")
      .fill(
        "Hardware sensors: $15,000. Gateway nodes: $5,000. Software: $12,000. Installation: $5,000. Cloud: $3,000. Contingency: $5,000."
      );
    await this.page
      .getByLabel("Timeline")
      .fill(
        "Week 1-2: Procurement. Week 3: Setup. Week 4: Development. Week 5: Installation."
      );
    await this.residencyDurationSelect.selectOption("5-weeks");
    await this.page
      .getByLabel("Demo Day Deliverable")
      .fill(
        "Live demonstration of the sensor dashboard showing real-time water quality data from pilot sensor nodes."
      );
    await this.page
      .getByLabel("Community Contribution")
      .fill(
        "Open-source all firmware and dashboard code under MIT license. Conduct two workshops for residents."
      );

    // Fill the default team member (index 0)
    await this.page.locator("#team-name-0").fill("Marina Oliveira");
    await this.page.locator("#team-role-0").fill("Project Lead");
  }
}
