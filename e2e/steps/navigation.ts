import { createBdd } from "playwright-bdd";
import { getLastProposalId } from "../helpers/test-state";

const { Given: given, When: when, Then: then } = createBdd();

// --- Navigation ---

given("I navigate to the home page {string}", async ({ page }, url: string) => {
  await page.goto(url, { waitUntil: "networkidle" });
});

given("I am on the proposal submission page {string}", async ({ page }, url: string) => {
  await page.goto(url);
});

when("I navigate to {string}", async ({ page }, url: string) => {
  // Replace {id} placeholder with actual seeded proposal ID
  if (url.includes("{id}")) {
    const id = getLastProposalId();
    if (id) {
      url = url.replace("{id}", id);
    }
  }
  await page.goto(url);
});

when("I navigate to the proposal detail page", async ({ page }) => {
  // Import dynamically to avoid circular deps
  const id = getLastProposalId();
  if (id) {
    await page.goto(`/grants/${id}`);
  } else {
    // Fallback: navigate via grants list
    await page.goto("/grants");
    await page.locator("a[href^='/grants/']").first().click();
  }
});

when("I navigate to the verification page", async ({ page }) => {
  const id = getLastProposalId();
  if (id) {
    await page.goto(`/grants/${id}/verify`);
  } else {
    await page.goto("/grants");
  }
});

then("the page should load successfully", async ({ page }) => {
  await page.waitForLoadState("domcontentloaded");
});

then("I should see the main content area", async ({ page }) => {
  await page.locator("main").first().waitFor({ state: "visible" });
});

then("I should be on the {string} page", async ({ page }, path: string) => {
  await page.waitForURL(new RegExp(path.replace(/\{[^}]+\}/g, "[\\w-]+")));
});

then("I should be navigated to {string}", async ({ page }, path: string) => {
  const pattern = path.replace(/\{[^}]+\}/g, "[\\w-]+");
  await page.waitForURL(new RegExp(pattern));
});

then("I should be redirected to the evaluation page {string}", async ({ page }, pattern: string) => {
  const urlPattern = pattern.replace(/\{[^}]+\}/g, "[\\w-]+");
  await page.waitForURL(new RegExp(urlPattern), { timeout: 30_000 });
  // Navigate away immediately to prevent the evaluate page from triggering
  // background AI evaluation workflows that crash the dev server (no API key in tests)
  await page.goto("about:blank");
});

then("I should be redirected to the evaluation page", async ({ page }) => {
  await page.waitForURL(/\/grants\/[\w-]+\/evaluate/, { timeout: 30_000 });
  // Navigate away to prevent background evaluation workflow
  await page.goto("about:blank");
});

then("I should be redirected to {string} after 3 seconds", async ({ page }, path: string) => {
  const pattern = path.replace(/\{[^}]+\}/g, "[\\w-]+");
  await page.waitForURL(new RegExp(pattern), { timeout: 10_000 });
});

then("I should see a 404 not found page", async ({ page }) => {
  await page.waitForSelector("text=404", { timeout: 5_000 });
});

then("I should receive a 404 not found response", async ({ page }) => {
  await page.waitForSelector("text=404", { timeout: 5_000 });
});

then("I should remain on the submission page", async ({ page }) => {
  await page.waitForURL(/\/grants\/submit/);
});
