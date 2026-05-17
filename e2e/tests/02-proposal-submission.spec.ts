import { test, expect } from "@playwright/test";
import { ProposalSubmitPage } from "../pages/proposal-submit.page";

test.describe("Proposal Submission", () => {
  let submitPage: ProposalSubmitPage;

  test.beforeEach(async ({ page }) => {
    submitPage = new ProposalSubmitPage(page);
    await submitPage.goto();
  });

  test("submit page renders form with all fields", async () => {
    await expect(submitPage.heading).toBeVisible();
    await expect(submitPage.titleInput).toBeVisible();
    await expect(submitPage.categorySelect).toBeVisible();
    await expect(submitPage.descriptionTextarea).toBeVisible();
    await expect(submitPage.problemStatementTextarea).toBeVisible();
    await expect(submitPage.proposedSolutionTextarea).toBeVisible();
    await expect(submitPage.budgetAmountInput).toBeVisible();
    await expect(submitPage.budgetBreakdownTextarea).toBeVisible();
    await expect(submitPage.timelineTextarea).toBeVisible();
    await expect(submitPage.residencyDurationSelect).toBeVisible();
    await expect(submitPage.demoDayDeliverableTextarea).toBeVisible();
    await expect(submitPage.communityContributionTextarea).toBeVisible();
    await expect(submitPage.submitButton).toBeVisible();
  });

  test("client-side validation blocks empty form", async () => {
    await submitPage.submitForm();

    // Should show validation errors — form should not navigate away
    await expect(submitPage.page).toHaveURL(/\/grants\/submit/);
    const errorCount = await submitPage.validationErrors.count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test("title minimum character validation", async ({ page }) => {
    await submitPage.fillTitle("Hi");
    await submitPage.submitForm();

    await expect(
      page.getByText("Title must be at least 5 characters")
    ).toBeVisible();
  });

  test("description minimum character validation", async ({ page }) => {
    // Fill title to pass its validation, but short description
    await submitPage.fillTitle("Valid Title Here");
    await submitPage.fillDescription("Too short");
    await submitPage.submitForm();

    await expect(
      page.getByText("Description must be at least 50 characters")
    ).toBeVisible();
  });

  test("budget validation rejects negative values", async ({ page }) => {
    await submitPage.fillAllRequired();
    await submitPage.fillBudget(-100);
    await submitPage.submitForm();

    await expect(page.getByText("Budget must be positive")).toBeVisible();
  });

  test("budget validation rejects amounts exceeding 1M", async ({ page }) => {
    await submitPage.fillAllRequired();
    await submitPage.fillBudget(1_500_000);
    await submitPage.submitForm();

    await expect(
      page.getByText("Budget cannot exceed 1,000,000")
    ).toBeVisible();
  });

  test("team member add and remove", async ({ page }) => {
    // Should start with 1 team member
    const nameInputs = page.locator('input[id^="team-name-"]');
    await expect(nameInputs).toHaveCount(1);

    // Add a second team member
    await submitPage.addTeamMemberButton.click();
    await expect(nameInputs).toHaveCount(2);

    // Remove buttons should appear when there are 2+ members
    const removeButtons = page.locator(
      'button:has-text("Remove")'
    );
    const removeCount = await removeButtons.count();
    expect(removeCount).toBeGreaterThanOrEqual(2);

    // Remove the second member
    await removeButtons.last().click();
    await expect(nameInputs).toHaveCount(1);
  });

  test("character counters update in real-time", async ({ page }) => {
    const testText = "Hello World";
    await submitPage.fillDescription(testText);

    // The counter should show the current length
    const counterText = `${testText.length}/5000`;
    await expect(page.getByText(counterText)).toBeVisible();
  });

  test("category dropdown contains all options", async ({ page: _page }) => {
    const options = await submitPage.categorySelect.locator("option").allTextContents();
    expect(options).toContain("Infrastructure");
    expect(options).toContain("Research");
    expect(options).toContain("Community");
    expect(options).toContain("Education");
    expect(options).toContain("Creative");
  });

  test("residency duration dropdown contains all options", async ({
    page: _page,
  }) => {
    const options = await submitPage.residencyDurationSelect
      .locator("option")
      .allTextContents();
    expect(options).toContain("3 Weeks");
    expect(options).toContain("4 Weeks");
    expect(options).toContain("5 Weeks");
  });
});
