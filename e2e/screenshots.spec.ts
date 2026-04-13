import { test } from "@playwright/test";
import {
  EVALUATED_PROPOSAL_ID,
  PENDING_PROPOSAL_ID,
  FUNDED_PROPOSAL_ID,
  DISPUTED_PROPOSAL_ID,
} from "./fixtures/seed-data";

/**
 * Screenshot capture suite — not assertions, just page captures
 * for documentation and visual review.
 */
test.describe("Page Screenshots", () => {
  test("capture landing page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/01-landing.png", fullPage: true });
  });

  test("capture grants listing (populated, page 1)", async ({ page }) => {
    await page.goto("/grants");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/02-grants-list-page1.png", fullPage: true });
  });

  test("capture grants listing (page 2 with pending)", async ({ page }) => {
    await page.goto("/grants?page=2");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/03-grants-list-page2.png", fullPage: true });
  });

  test("capture grants search results", async ({ page }) => {
    await page.goto("/grants?search=Solar");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/04-grants-search.png", fullPage: true });
  });

  test("capture evaluated proposal detail", async ({ page }) => {
    await page.goto(`/grants/${EVALUATED_PROPOSAL_ID}`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/05-proposal-evaluated.png", fullPage: true });
  });

  test("capture evaluated proposal with dimensions expanded", async ({ page }) => {
    await page.goto(`/grants/${EVALUATED_PROPOSAL_ID}`);
    await page.waitForLoadState("networkidle");
    // Expand all dimension details
    const summaries = page.locator("details summary");
    const count = await summaries.count();
    for (let i = 0; i < count; i++) {
      await summaries.nth(i).click();
    }
    await page.screenshot({ path: "e2e/screenshots/06-proposal-dimensions-expanded.png", fullPage: true });
  });

  test("capture funded proposal with fund release", async ({ page }) => {
    await page.goto(`/grants/${FUNDED_PROPOSAL_ID}`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/07-proposal-funded.png", fullPage: true });
  });

  test("capture disputed proposal with disputes", async ({ page }) => {
    await page.goto(`/grants/${DISPUTED_PROPOSAL_ID}`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/08-proposal-disputed.png", fullPage: true });
  });

  test("capture pending proposal (no scores)", async ({ page }) => {
    await page.goto(`/grants/${PENDING_PROPOSAL_ID}`);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/09-proposal-pending.png", fullPage: true });
  });

  test("capture 404 page", async ({ page }) => {
    await page.goto("/grants/nonexistent");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/10-proposal-404.png", fullPage: true });
  });

  test("capture operator dashboard redirect", async ({ page }) => {
    await page.goto("/dashboard/operator");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/11-operator-auth-redirect.png", fullPage: true });
  });
});
