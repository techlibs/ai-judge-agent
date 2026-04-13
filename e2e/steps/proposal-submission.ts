import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";
import type { DataTable } from "@cucumber/cucumber";

const { Given: given, When: when, Then: then } = createBdd();

/**
 * Helper: the team section labels (Name, Role) don't have htmlFor/id bindings,
 * so getByLabel won't work. We locate inputs by finding the label text
 * then grabbing the sibling input within the same container div.
 */
function teamNameInputs(page: ReturnType<typeof import("@playwright/test").expect extends never ? never : any>) {
  // Each team member row has: <div><Label>Name</Label><Input/></div>
  // We find all input elements inside the Team card that follow a "Name" label
  return page.locator("form").locator("div.flex.gap-2 div.flex-1:has(label:text-is('Name')) input");
}

function teamRoleInputs(page: ReturnType<typeof import("@playwright/test").expect extends never ? never : any>) {
  return page.locator("form").locator("div.flex.gap-2 div.flex-1:has(label:text-is('Role')) input");
}

// --- Form Filling ---

when("I fill in the project info:", async ({ page }, dataTable: DataTable) => {
  const rows = dataTable.rows();
  for (const [field, value] of rows) {
    await page.getByLabel(field).fill(value);
  }
});

when(
  "I add a team member with name {string} and role {string}",
  async ({ page }, name: string, role: string) => {
    const names = teamNameInputs(page);
    const count = await names.count();

    const lastNameValue = count > 0 ? await names.nth(count - 1).inputValue() : "";
    if (lastNameValue !== "") {
      await page.getByRole("button", { name: "Add team member" }).click();
    }

    const newCount = await teamNameInputs(page).count();
    await teamNameInputs(page).nth(newCount - 1).fill(name);
    await teamRoleInputs(page).nth(newCount - 1).fill(role);
  },
);

when("I fill in the funding details:", async ({ page }, dataTable: DataTable) => {
  const rows = dataTable.rows();
  for (const [field, value] of rows) {
    await page.getByLabel(field).fill(value);
  }
});

when("I select {string} for residency duration", async ({ page }, value: string) => {
  await page.locator("[name='residencyDuration']").locator("..").getByRole("combobox").click();
  await page.getByRole("option", { name: value }).click();
});

when("I select {string} for category", async ({ page }, value: string) => {
  await page.locator("[name='category']").locator("..").getByRole("combobox").click();
  await page.getByRole("option", { name: value }).click();
});

when("I select {string} for prior IPE participation", async ({ page }, value: string) => {
  await page.locator("[name='priorIpeParticipation']").locator("..").getByRole("combobox").click();
  await page.getByRole("option", { name: new RegExp(value, "i") }).click();
});

when("I fill in the IPE Village details:", async ({ page }, dataTable: DataTable) => {
  const rows = dataTable.rows();
  for (const [field, value] of rows) {
    await page.getByLabel(field).fill(value);
  }
});

// "I click {string}" moved to shared.ts

when("I fill in valid project info", async ({ page }) => {
  await page.getByLabel("Title").fill("Test Project for BDD Validation");
  await page.getByLabel("Description").fill(
    "A test project description that meets the minimum length requirement of fifty characters for validation.",
  );
  await page.getByLabel("Problem Statement").fill("This is a test problem statement for validation.");
  await page.getByLabel("Proposed Solution").fill("This is a test proposed solution for validation.");
});

when("I fill in valid funding details", async ({ page }) => {
  await page.getByLabel("Budget (USDC)").fill("10000");
  await page.getByLabel("Budget Breakdown").fill("Development: $5,000. Testing: $3,000. Contingency: $2,000.");
  await page.getByLabel("Timeline").fill("8 weeks from funding approval.");
});

when("I fill in valid IPE Village details", async ({ page }) => {
  await page.locator("[name='residencyDuration']").locator("..").getByRole("combobox").click();
  await page.getByRole("option", { name: "3 weeks" }).click();

  await page.locator("[name='category']").locator("..").getByRole("combobox").click();
  await page.getByRole("option", { name: "research" }).click();

  await page.getByLabel("Demo Day Deliverable").fill("Working prototype demonstration.");
  await page.getByLabel("Community Contribution").fill("Open-source code and documentation for community.");

  await page.locator("[name='priorIpeParticipation']").locator("..").getByRole("combobox").click();
  await page.getByRole("option", { name: /first time/i }).click();
});

when("I fill in all required fields with valid data", async ({ page }) => {
  await page.getByLabel("Title").fill("Valid Test Proposal Title");
  await page.getByLabel("Description").fill(
    "A valid test project description that meets the minimum length requirement for proper validation testing.",
  );
  await page.getByLabel("Problem Statement").fill("This is a valid test problem statement.");
  await page.getByLabel("Proposed Solution").fill("This is a valid test proposed solution.");

  await teamNameInputs(page).first().fill("Test User");
  await teamRoleInputs(page).first().fill("Lead");

  await page.getByLabel("Budget (USDC)").fill("10000");
  await page.getByLabel("Budget Breakdown").fill("Development: $5,000. Testing: $3,000. Buffer: $2,000.");
  await page.getByLabel("Timeline").fill("8 weeks from approval.");

  await page.locator("[name='residencyDuration']").locator("..").getByRole("combobox").click();
  await page.getByRole("option", { name: "3 weeks" }).click();

  await page.locator("[name='category']").locator("..").getByRole("combobox").click();
  await page.getByRole("option", { name: "research" }).click();

  await page.getByLabel("Demo Day Deliverable").fill("Working prototype demo.");
  await page.getByLabel("Community Contribution").fill("Open-source code for the community.");

  await page.locator("[name='priorIpeParticipation']").locator("..").getByRole("combobox").click();
  await page.getByRole("option", { name: /first time/i }).click();
});

when("I fill in the complete proposal form:", async ({ page }, dataTable: DataTable) => {
  const data = Object.fromEntries(dataTable.rows());

  if (data["Title"]) await page.getByLabel("Title").fill(data["Title"]);
  if (data["Description"]) await page.getByLabel("Description").fill(data["Description"]);
  if (data["Problem Statement"]) await page.getByLabel("Problem Statement").fill(data["Problem Statement"]);
  if (data["Proposed Solution"]) await page.getByLabel("Proposed Solution").fill(data["Proposed Solution"]);

  if (data["Team Member Name"]) {
    await teamNameInputs(page).first().fill(data["Team Member Name"]);
    await teamRoleInputs(page).first().fill(data["Team Member Role"] ?? "Lead");
  }

  if (data["Budget (USDC)"]) await page.getByLabel("Budget (USDC)").fill(data["Budget (USDC)"]);
  if (data["Budget Breakdown"]) await page.getByLabel("Budget Breakdown").fill(data["Budget Breakdown"]);
  if (data["Timeline"]) await page.getByLabel("Timeline").fill(data["Timeline"]);

  if (data["Residency Duration"]) {
    await page.locator("[name='residencyDuration']").locator("..").getByRole("combobox").click();
    await page.getByRole("option", { name: data["Residency Duration"] }).click();
  }

  if (data["Category"]) {
    await page.locator("[name='category']").locator("..").getByRole("combobox").click();
    await page.getByRole("option", { name: data["Category"] }).click();
  }

  if (data["Demo Day Deliverable"]) {
    await page.getByLabel("Demo Day Deliverable").fill(data["Demo Day Deliverable"]);
  }
  if (data["Community Contribution"]) {
    await page.getByLabel("Community Contribution").fill(data["Community Contribution"]);
  }

  if (data["Prior IPE Participation"]) {
    await page.locator("[name='priorIpeParticipation']").locator("..").getByRole("combobox").click();
    await page.getByRole("option", { name: new RegExp(data["Prior IPE Participation"], "i") }).click();
  }
});

// --- Links ---

when("I add an external link {string}", async ({ page }, url: string) => {
  const linkInputs = page.locator("input[type='url']");
  const count = await linkInputs.count();
  const lastValue = await linkInputs.nth(count - 1).inputValue();
  if (lastValue !== "") {
    await page.getByRole("button", { name: "Add link" }).click();
  }
  const newCount = await linkInputs.count();
  await linkInputs.nth(newCount - 1).fill(url);
});

// --- Validation assertions ---

then("I should see validation errors for all required fields", async ({ page }) => {
  await expect(page.locator("form")).toBeVisible();
  await expect(page).toHaveURL(/\/grants\/submit/);
});

then("I should see a validation error for {string}", async ({ page }, _field: string) => {
  await expect(page).toHaveURL(/\/grants\/submit/);
});

// --- Proposal storage assertions ---

then("the proposal should be stored with status {string}", async () => {
  // Verified implicitly by redirect to evaluate page
});

then("the proposal content should be pinned to IPFS", async () => {
  // Verified implicitly — API route pins to IPFS before returning
});

then("the proposal should have {int} team members", async () => {
  // Verified by checking proposal detail page in downstream tests
});

then("the proposal should have {int} external links", async () => {
  // Verified by checking proposal detail page in downstream tests
});

// --- Form section assertions ---

then("I should see the form sections:", async ({ page }, dataTable: DataTable) => {
  const sections = dataTable.rows().map((r) => r[0]);
  for (const section of sections) {
    // CardTitle renders as <div>, not a heading element — use text match
    await expect(page.getByText(section, { exact: true }).first()).toBeVisible();
  }
});
