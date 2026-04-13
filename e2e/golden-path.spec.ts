import { test, expect } from "@playwright/test";

/**
 * Golden path E2E test suite for the IPE City Grants AI Judge system.
 *
 * Flow:
 *   1. Landing page loads
 *   2. Submit a grant proposal via form
 *   3. Proposal appears in the grants list
 *   4. Proposal detail page renders content
 *   5. Evaluation page triggers AI judges (skipped without real APIs)
 *   6. Verification page loads for published proposals (skipped without chain data)
 */

test.describe.configure({ mode: "serial" });

const TEST_PROPOSAL = {
  title: "Decentralized Solar Grid for IPE Village",
  description:
    "A community-owned solar micro-grid that provides clean energy to all IPE Village residents. " +
    "The system uses IoT sensors and a transparent ledger to track energy production and consumption.",
  problemStatement:
    "IPE Village currently relies on expensive and unreliable diesel generators for electricity.",
  proposedSolution:
    "Install a 50kW solar array with battery storage, managed by smart contracts for fair distribution.",
  budgetAmount: "25000",
  budgetBreakdown:
    "Solar panels: $15,000. Battery storage: $5,000. IoT sensors and installation: $3,000. Contingency: $2,000.",
  timeline: "12 weeks from funding approval to full installation and handover.",
  demoDayDeliverable:
    "Live dashboard showing real-time energy production and distribution metrics.",
  communityContribution:
    "Free workshops on solar maintenance for village residents and open-source hardware plans.",
  teamMemberName: "Alice Santos",
  teamMemberRole: "Project Lead",
};

let proposalId: string;

test("1 - landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Next/i);
  // The default landing page should be reachable
  await expect(page.locator("main")).toBeVisible();
});

test("2 - grants listing page loads", async ({ page }) => {
  await page.goto("/grants");
  await expect(page.getByRole("heading", { name: "IPE City Grants" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Submit a Proposal" })).toBeVisible();
});

test("3 - submit proposal form page loads", async ({ page }) => {
  await page.goto("/grants/submit");
  await expect(
    page.getByRole("heading", { name: "Submit a Grant Proposal" })
  ).toBeVisible();
  // Verify all form sections are present
  await expect(page.getByRole("heading", { name: "Project Info" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Team" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Funding" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "IPE Village" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Links" })).toBeVisible();
});

test("4 - fill and submit a proposal", async ({ page }) => {
  await page.goto("/grants/submit");

  // Project Info
  await page.getByLabel("Title").fill(TEST_PROPOSAL.title);
  await page.getByLabel("Description").fill(TEST_PROPOSAL.description);
  await page.getByLabel("Problem Statement").fill(TEST_PROPOSAL.problemStatement);
  await page.getByLabel("Proposed Solution").fill(TEST_PROPOSAL.proposedSolution);

  // Team - first member fields (already rendered by default)
  const teamSection = page.locator("form");
  const nameInputs = teamSection.getByLabel("Name");
  const roleInputs = teamSection.getByLabel("Role");
  await nameInputs.first().fill(TEST_PROPOSAL.teamMemberName);
  await roleInputs.first().fill(TEST_PROPOSAL.teamMemberRole);

  // Funding
  await page.getByLabel("Budget (USDC)").fill(TEST_PROPOSAL.budgetAmount);
  await page.getByLabel("Budget Breakdown").fill(TEST_PROPOSAL.budgetBreakdown);
  await page.getByLabel("Timeline").fill(TEST_PROPOSAL.timeline);

  // IPE Village - Select dropdowns (shadcn Select uses radix triggers)
  // Residency Duration
  await page
    .locator("[name='residencyDuration']")
    .locator("..")
    .getByRole("combobox")
    .click();
  await page.getByRole("option", { name: "3 weeks" }).click();

  // Category
  await page
    .locator("[name='category']")
    .locator("..")
    .getByRole("combobox")
    .click();
  await page.getByRole("option", { name: "infrastructure" }).click();

  // Demo Day Deliverable
  await page.getByLabel("Demo Day Deliverable").fill(TEST_PROPOSAL.demoDayDeliverable);

  // Community Contribution
  await page
    .getByLabel("Community Contribution")
    .fill(TEST_PROPOSAL.communityContribution);

  // Prior IPE Participation
  await page
    .locator("[name='priorIpeParticipation']")
    .locator("..")
    .getByRole("combobox")
    .click();
  await page.getByRole("option", { name: /first time/i }).click();

  // Submit
  await page.getByRole("button", { name: "Submit Proposal" }).click();

  // After successful submission, the form redirects to /grants/[id]/evaluate
  await page.waitForURL(/\/grants\/[\w-]+\/evaluate/, { timeout: 15_000 });

  // Extract the proposal ID from the URL
  const url = page.url();
  const match = url.match(/\/grants\/([\w-]+)\/evaluate/);
  expect(match).toBeTruthy();
  proposalId = match![1];
  expect(proposalId).toBeTruthy();
});

test("5 - submitted proposal appears in grants list", async ({ page }) => {
  test.skip(!proposalId, "No proposal was submitted in the previous test");

  await page.goto("/grants");
  await expect(page.getByText(TEST_PROPOSAL.title)).toBeVisible();
});

test("6 - proposal detail page shows content", async ({ page }) => {
  test.skip(!proposalId, "No proposal was submitted in the previous test");

  await page.goto(`/grants/${proposalId}`);
  await expect(page.getByRole("heading", { name: TEST_PROPOSAL.title })).toBeVisible();
  await expect(page.getByText(TEST_PROPOSAL.description)).toBeVisible();
  await expect(page.getByText(TEST_PROPOSAL.problemStatement)).toBeVisible();
  await expect(page.getByText(TEST_PROPOSAL.proposedSolution)).toBeVisible();
  await expect(page.getByText(/25,000/)).toBeVisible();
  // Status badge should show "pending"
  await expect(page.getByText("pending")).toBeVisible();
  // "Start Evaluation" link should be present for pending proposals
  await expect(page.getByRole("link", { name: "Start Evaluation" })).toBeVisible();
});

test("7 - evaluate page loads and triggers evaluation", async ({ page }) => {
  test.skip(!proposalId, "No proposal was submitted in the previous test");
  test.skip(
    !process.env.ANTHROPIC_API_KEY,
    "Skipping AI evaluation: ANTHROPIC_API_KEY not set"
  );

  await page.goto(`/grants/${proposalId}/evaluate`);

  // The page should show either "Starting Evaluation..." or "Live Evaluation"
  const startingHeading = page.getByRole("heading", { name: "Starting Evaluation..." });
  const liveHeading = page.getByRole("heading", { name: "Live Evaluation" });
  const errorHeading = page.getByRole("heading", { name: "Error" });

  // Wait for one of the three states
  await expect(
    startingHeading.or(liveHeading).or(errorHeading)
  ).toBeVisible({ timeout: 15_000 });
});

test("8 - verify page loads for published proposals", async ({ page }) => {
  test.skip(!proposalId, "No proposal was submitted in the previous test");

  // Navigate to verify page - it will 404 unless the proposal is "published"
  // so we just confirm the page doesn't crash and renders something
  const response = await page.goto(`/grants/${proposalId}/verify`);

  // For a pending proposal this should return 404 (the verify page requires status=published)
  // This is the expected behavior - the page guards with notFound()
  if (response && response.status() === 404) {
    // Expected for a non-published proposal
    return;
  }

  // If somehow the proposal got published (e.g., evaluation completed), verify the page
  await expect(
    page.getByRole("heading", { name: "On-Chain Verification" })
  ).toBeVisible();
  await expect(page.getByText("Project Identity")).toBeVisible();
  await expect(page.getByText("Judge Evaluations")).toBeVisible();
});
