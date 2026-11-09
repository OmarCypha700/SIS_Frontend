import { expect, test } from "@playwright/test";

import { ACCOUNTS, login, open } from "./helpers.mjs";

test("after three wrong passwords the sign-in button counts down", async ({ page }) => {
  await page.context().clearCookies();
  await open(page, "/login");
  // An address no other test uses (the wait applies to unknown emails too, so it never reveals accounts).
  await page.getByLabel("Email").fill("someone-else@example.test");
  const password = page.getByLabel("Password", { exact: true });
  const button = page.getByRole("button", { name: /^Sign in$|^Try again in/ });
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await password.fill(`wrong-${attempt}`);
    await button.click();
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
  }
  await password.fill("wrong-4");
  await button.click();
  await expect(page.getByText(/Try again in 15 seconds\./)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Try again in \d+s$/ })).toBeDisabled();
});

test("a lecturer sets up a passkey and signs in with it instead of a password", async ({ page }) => {
  // Chromium's virtual authenticator acts as the device's fingerprint reader.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true,
      isUserVerified: true, automaticPresenceSimulation: true,
    },
  });

  await login(page, ACCOUNTS.lecturer);
  await open(page, "/profile#passkeys");
  const card = page.locator("#passkeys");
  await card.getByLabel("Name for this device").fill("Office laptop");
  await card.getByRole("button", { name: "Set up on this device" }).click();
  await expect(page.getByText(/Next time, choose/)).toBeVisible();
  await expect(card.getByText("Office laptop")).toBeVisible();

  // Signed out: one tap, no email or password.
  await page.context().clearCookies();
  await open(page, "/login");
  await page.getByRole("button", { name: "Sign in with fingerprint or face" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /Welcome, Yaw/ })).toBeVisible();

  // The passkey records when it was last used; removing it is one click.
  await open(page, "/profile#passkeys");
  await expect(card.getByText(/last used/)).toBeVisible();
  await card.getByRole("button", { name: "Remove Office laptop" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Passkey removed.")).toBeVisible();
});
