import { expect, test } from "@playwright/test";

import { ACCOUNTS, login, open } from "./helpers.mjs";

// Most students use the portal on a phone: their pages must fit a narrow screen without sideways scrolling.
test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });

async function fitsScreen(page) {
  const { scroll, width } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: document.documentElement.clientWidth,
  }));
  expect(scroll, `${page.url()} scrolls sideways`).toBeLessThanOrEqual(width);
}

test("student pages fit a phone screen", async ({ page }) => {
  await login(page, ACCOUNTS.student);
  await fitsScreen(page);
  for (const url of ["/registration", "/registration/history", "/my-results", "/my-results/transcript", "/fees", "/profile", "/notifications"]) {
    await open(page, url);
    await fitsScreen(page);
  }
});

test("a student sees every grade on a phone without scrolling sideways", async ({ page }) => {
  await login(page, ACCOUNTS.student);
  await open(page, "/my-results");
  const row = page.locator("li").filter({ hasText: /credits/ }).first();
  await expect(row).toBeVisible();
  const box = await row.locator("span").last().boundingBox();
  expect(box.x + box.width).toBeLessThanOrEqual(375);
});

test("course registration keeps the next step within reach on a phone", async ({ page }) => {
  await login(page, ACCOUNTS.student);
  await open(page, "/registration");
  const bar = page.getByRole("region", { name: "Registration actions" });
  test.skip(!(await bar.count()), "Registration is not open for the demo student");
  await page.mouse.wheel(0, 2000);
  await expect(bar.getByRole("button", { name: /Review/ })).toBeInViewport();
  await expect(bar).toContainText("credits");
});
