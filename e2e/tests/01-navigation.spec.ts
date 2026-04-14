import { test, expect } from "@playwright/test";
import { HomePage } from "../pages/home.page";
import { GrantsListPage } from "../pages/grants-list.page";
import { GrantDetailPage } from "../pages/grant-detail.page";
import { OperatorDashboardPage } from "../pages/operator-dashboard.page";

const SAMPLE_PROPOSAL_ID = "test-proposal-abc123";

test.describe("Navigation", () => {
  test("home page renders with correct nav links", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await expect(homePage.heading).toBeVisible();
    await expect(homePage.subtitle).toBeVisible();
    await expect(homePage.submitProposalLink).toBeVisible();
    await expect(homePage.viewProposalsLink).toBeVisible();
    await expect(homePage.operatorDashboardLink).toBeVisible();
  });

  test("grants listing shows empty state", async ({ page }) => {
    const grantsPage = new GrantsListPage(page);
    await grantsPage.goto();

    await expect(grantsPage.heading).toBeVisible();
    await expect(grantsPage.emptyStateHeading).toBeVisible();
    await expect(grantsPage.emptyStateMessage).toBeVisible();
    await expect(grantsPage.submitFirstProposalButton).toBeVisible();
  });

  test("grant detail page renders evaluation info", async ({ page }) => {
    const detailPage = new GrantDetailPage(page);
    await detailPage.goto(SAMPLE_PROPOSAL_ID);

    await expect(detailPage.heading).toBeVisible();
    await expect(detailPage.evaluationSubmittedBanner).toBeVisible();
    await expect(detailPage.scoringDimensionsHeading).toBeVisible();
    await expect(detailPage.technicalFeasibilityCard).toBeVisible();
    await expect(detailPage.impactPotentialCard).toBeVisible();
    await expect(detailPage.costEfficiencyCard).toBeVisible();
    await expect(detailPage.teamCapabilityCard).toBeVisible();
  });

  test("operator dashboard shows system status", async ({ page }) => {
    const dashboardPage = new OperatorDashboardPage(page);
    await dashboardPage.goto();

    await expect(dashboardPage.heading).toBeVisible();
    await expect(dashboardPage.systemStatusLabel).toBeVisible();
    await expect(dashboardPage.operationalBadge).toBeVisible();
    await expect(dashboardPage.networkTitle).toBeVisible();
    await expect(dashboardPage.contractsBadge).toBeVisible();
  });

  test("navigate from grants list to submit form", async ({ page }) => {
    const grantsPage = new GrantsListPage(page);
    await grantsPage.goto();

    await grantsPage.submitFirstProposalButton.click();
    await expect(page).toHaveURL(/\/grants\/submit/);
    await expect(
      page.getByRole("heading", { name: "Submit a Grant Proposal" })
    ).toBeVisible();
  });

  test("back navigation from detail to list", async ({ page }) => {
    const detailPage = new GrantDetailPage(page);
    await detailPage.goto(SAMPLE_PROPOSAL_ID);

    await detailPage.backToProposalsLink.click();
    await expect(page).toHaveURL(/\/grants$/);
    await expect(
      page.getByRole("heading", { name: "Grant Proposals" })
    ).toBeVisible();
  });
});
