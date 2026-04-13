import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { Given, When, Then } = createBdd();

// --- Navigation steps ---

Given("I am on the proposals page", async ({ page }) => {
  await page.goto("/proposals");
});

Given("I am on the new proposal page", async ({ page }) => {
  await page.goto("/proposals/new");
});

Given("I am on the home page", async ({ page }) => {
  await page.goto("/");
});

Given("I navigate to proposal {string}", async ({ page }, proposalId: string) => {
  await page.goto(`/proposals/${proposalId}`);
});

Given(
  "I navigate to evaluation for proposal {string}",
  async ({ page }, proposalId: string) => {
    await page.goto(`/proposals/${proposalId}/evaluation`);
  },
);

Given(
  "I navigate to reputation for proposal {string}",
  async ({ page }, proposalId: string) => {
    await page.goto(`/proposals/${proposalId}/reputation`);
  },
);

// --- Common assertions ---

Then(
  "I should see the {string} heading",
  async ({ page }, headingText: string) => {
    await expect(
      page.getByRole("heading", { name: headingText }),
    ).toBeVisible();
  },
);

Then(
  "I should see a {string} heading",
  async ({ page }, headingText: string) => {
    await expect(
      page.getByRole("heading", { name: new RegExp(headingText, "i") }),
    ).toBeVisible();
  },
);

Then(
  "I should see a {string} link",
  async ({ page }, linkText: string) => {
    await expect(
      page.getByRole("link", { name: new RegExp(linkText, "i") }),
    ).toBeVisible();
  },
);

Then(
  "I should see a {string} button",
  async ({ page }, buttonText: string) => {
    await expect(
      page.getByRole("button", { name: new RegExp(buttonText, "i") }),
    ).toBeVisible({ timeout: 10_000 });
  },
);

Then("I should see {string}", async ({ page }, text: string) => {
  await expect(page.getByText(new RegExp(text, "i"))).toBeVisible();
});

Then("I should be redirected to the proposals page", async ({ page }) => {
  await page.waitForURL("**/proposals");
  expect(page.url()).toContain("/proposals");
});

Then("I should be on the new proposal page", async ({ page }) => {
  await page.waitForURL("**/proposals/new");
  expect(page.url()).toContain("/proposals/new");
});

When("I click the submit proposal link", async ({ page }) => {
  const submitLink = page.getByRole("link", { name: /submit.*proposal/i });
  await submitLink.click();
});
