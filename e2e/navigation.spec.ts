import { test, expect } from "@playwright/test";

test.describe("Cross-page navigation", () => {
  test("root redirects to /proposals", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/proposals");
    expect(page.url()).toContain("/proposals");
  });

  test("proposals page has submit proposal link", async ({ page }) => {
    await page.goto("/proposals");

    const submitLink = page.getByRole("link", { name: /submit.*proposal/i });
    await expect(submitLink).toBeVisible();
  });

  test("clicking submit proposal navigates to /proposals/new", async ({ page }) => {
    await page.goto("/proposals");

    const submitLink = page.getByRole("link", { name: /submit.*proposal/i });
    await submitLink.click();
    await page.waitForURL("**/proposals/new");
    expect(page.url()).toContain("/proposals/new");
  });

  test("/proposals/new has app navigation", async ({ page }) => {
    await page.goto("/proposals/new");

    // The app shell has the "IPE City Grants" header link for navigation
    const navLink = page.getByRole("link", { name: "IPE City Grants" });
    await expect(navLink).toBeVisible();
  });
});
