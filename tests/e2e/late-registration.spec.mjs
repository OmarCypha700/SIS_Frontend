import { expect, test } from "@playwright/test";

import { ACCOUNTS, apiGet, login, open } from "./helpers.mjs";

// Payments go to the fake gateway in fake-paystack.mjs. Every setting changed here is restored.
test.describe.configure({ mode: "serial" });

async function send(page, method, url, data) {
  const csrf = (await page.context().cookies()).find((c) => c.name === "csrftoken")?.value ?? "";
  const response = await page.request.fetch(`/api/v1${url}`, { method, data, headers: { "X-CSRFToken": csrf } });
  expect(response.ok(), `${method} ${url} -> ${response.status()}`).toBeTruthy();
  return response.json();
}

test("a student who missed registration pays the late penalty and can then register", async ({ page }) => {
  await login(page, ACCOUNTS.registrar);
  // A seeded demo student (accounts made by other tests must change their password at first sign-in).
  const waiting = (await apiGet(page, "/registrations/not-registered/?page_size=50")).results
    .find((s) => s.email !== ACCOUNTS.student && s.email.endsWith("@students.northridge.example"));
  test.skip(!waiting, "Every demo student is already registered");

  await login(page, ACCOUNTS.admin);
  const { semester: current } = await apiGet(page, "/academic/current-period/");
  const original = await apiGet(page, `/semesters/${current.id}/`);
  const now = Date.now();
  await send(page, "PATCH", "/institution/settings/", { late_registration_penalty: "150.00", online_payments_enabled: true });
  await send(page, "PATCH", `/semesters/${current.id}/`, {
    registration_end: new Date(now - 60 * 60 * 1000).toISOString(),
    late_registration_end: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(),
  });
  try {
    await login(page, waiting.email);
    await open(page, "/registration");
    const notice = page.getByRole("status").filter({ hasText: "Late registration" });
    await expect(notice.getByText("GHS 150.00 penalty")).toBeVisible();
    await expect(page.getByRole("button", { name: /Review registration/ }).first()).toBeDisabled();

    await notice.getByRole("button", { name: "Add the penalty to my fees" }).click();
    await expect(page.getByText("GHS 150.00 still to pay.")).toBeVisible();
    await notice.getByRole("link", { name: "Pay now" }).click();
    await page.getByRole("button", { name: "Pay now" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /^Pay GHS/ }).click();
    await expect(page.getByText("Payment received")).toBeVisible();

    await open(page, "/registration");
    await expect(page.getByText("Late registration penalty paid")).toBeVisible();
  } finally {
    await login(page, ACCOUNTS.admin);
    await send(page, "PATCH", `/semesters/${current.id}/`, {
      registration_end: original.registration_end, late_registration_end: original.late_registration_end,
    });
    await send(page, "PATCH", "/institution/settings/", { late_registration_penalty: "0", online_payments_enabled: false });
  }
});
