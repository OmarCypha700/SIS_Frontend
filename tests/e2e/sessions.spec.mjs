import { expect, test } from "@playwright/test";

import { ACCOUNTS, login, open } from "./helpers.mjs";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) "
  + "Version/18.1 Mobile/15E148 Safari/604.1";

/** A second device: its own browser profile, posing as an iPhone. */
async function phoneSignedIn(browser, email) {
  const context = await browser.newContext({ userAgent: IPHONE, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await login(page, email);
  return { context, page };
}

async function isSignedOut(page) {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
}

test("someone sees where they are signed in and signs a lost phone out", async ({ page, browser }) => {
  const phone = await phoneSignedIn(browser, ACCOUNTS.officer);
  try {
    await login(page, ACCOUNTS.officer);
    await open(page, "/profile#devices");
    const list = page.getByRole("list", { name: "Signed-in devices" });
    await expect(list.getByRole("listitem").filter({ hasText: "This device" })).toHaveCount(1);
    await expect(list.getByText("Safari on iPhone").first()).toBeVisible();

    await list.getByRole("button", { name: "Sign out Safari on iPhone" }).first().click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByText("Signed out of Safari on iPhone.")).toBeVisible();
    await isSignedOut(phone.page);

    // The password form offers to sign out the other devices, ticked by default.
    await expect(page.getByRole("checkbox", { name: /Sign out of my other devices/ })).toBeChecked();
  } finally {
    await phone.context.close();
  }
});

test("an administrator signs a staff member out everywhere", async ({ page, browser }) => {
  const phone = await phoneSignedIn(browser, ACCOUNTS.accounts);
  try {
    await login(page, ACCOUNTS.admin);
    await open(page, "/settings/users");
    await page.getByLabel("Search").fill(ACCOUNTS.accounts);
    const row = page.getByRole("row").filter({ hasText: ACCOUNTS.accounts });
    await expect(row).toHaveCount(1);
    await row.getByRole("button", { name: /^Actions for / }).click();
    await page.getByRole("menuitem", { name: "Sign out everywhere" }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByLabel("Reason").fill("Phone reported stolen");
    await dialog.getByRole("button", { name: "Sign out everywhere" }).click();
    await expect(page.getByText(/was signed out of \d+ devices?\./)).toBeVisible();
    await isSignedOut(phone.page);

    // The sign-in limits are institution settings.
    await open(page, "/settings/institution");
    await expect(page.getByLabel("Students sign in again after (days)")).toHaveValue("7");
    await expect(page.getByLabel("Staff sign in again after (hours)")).toHaveValue("24");
  } finally {
    await phone.context.close();
  }
});
