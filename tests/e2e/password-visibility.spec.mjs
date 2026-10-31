import { expect, test } from "@playwright/test";

import { open } from "./helpers.mjs";

test("the eye button shows and hides a typed password", async ({ page }) => {
  await page.context().clearCookies();
  await open(page, "/login");
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("Secret-Example-1");
  await expect(password).toHaveAttribute("type", "password");

  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("Secret-Example-1");

  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");
  // The button is not a submit button: the form was not sent.
  await expect(page).toHaveURL(/\/login/);
});
