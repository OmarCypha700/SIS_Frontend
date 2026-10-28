import { expect, test } from "@playwright/test";

import { ACCOUNTS, login, open } from "./helpers.mjs";

test("the portal is an installable app with an offline page", async ({ page, context }) => {
  const manifest = await (await page.request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/dashboard");
  expect(manifest.name).toContain("Northridge");
  expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBeTruthy();
  const icon = await page.request.get(manifest.icons[0].src);
  expect(icon.headers()["content-type"]).toBe("image/png");

  await login(page, ACCOUNTS.student);
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toMatch(/\/$/);
  // Reload so the service worker controls the page, then lose the connection.
  await page.reload();
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBeTruthy();
  await context.setOffline(true);
  await page.goto("/my-results").catch(() => {});
  await expect(page.getByRole("heading", { name: "You\u2019re offline" })).toBeVisible();
  await context.setOffline(false);
});

test("notification settings are on the profile page", async ({ page, context }) => {
  await context.grantPermissions(["notifications"]);
  await login(page, ACCOUNTS.lecturer);
  await open(page, "/profile#notifications");
  const card = page.locator("#notifications");
  await expect(card.getByRole("switch", { name: "Push notifications on this device" })).toBeVisible();
  await expect(card.getByRole("switch", { name: "Notification sound" })).toBeChecked();
  await card.getByRole("switch", { name: "Email me when something needs my action" }).click();
  await expect(card.getByRole("switch", { name: "Email me when something needs my action" })).not.toBeChecked();
  await card.getByRole("switch", { name: "Email me when something needs my action" }).click();
  await expect(card.getByRole("switch", { name: "Email me when something needs my action" })).toBeChecked();

  await card.getByRole("button", { name: "Send a test notification" }).click();
  await expect(page.getByTestId("unread-count")).toBeVisible();
  await open(page, "/notifications");
  await expect(page.getByRole("button", { name: /Test notification/ }).first()).toBeVisible();
});
