import { expect, test } from "@playwright/test";

import { ACCOUNTS, apiGet, login, open } from "./helpers.mjs";

test.describe.configure({ mode: "serial" });

const TUTOR = "lecturer2@northridge.example"; // Akua Teacher, a tutor in the demo data

test("a tutor appointed results officer gains the office and loses it when the appointment ends", async ({ page }) => {
  await login(page, ACCOUNTS.admin);
  await open(page, "/settings/appointments");
  await page.getByRole("button", { name: "New appointment" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Staff member").selectOption({ label: "Mrs. Akua Teacher (Lecturer)" });
  await dialog.getByLabel("Office").selectOption("RESULTS_OFFICER");
  await dialog.getByLabel("Reference").fill("NRC/APT/2026/07");
  await dialog.getByRole("button", { name: "Record appointment" }).click();
  await expect(page.getByText("Appointment recorded.")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Results Officer" }).first()).toBeVisible();

  // The tutor keeps teaching and now also works as results officer.
  await login(page, TUTOR);
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "My courses" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Result sheets" })).toBeVisible();
  const me = await apiGet(page, "/auth/me/");
  expect(me.roles).toEqual(expect.arrayContaining(["LECTURER", "RESULTS_OFFICER"]));
  await open(page, "/profile");
  await expect(page.getByText("Lecturer · Results Officer").first()).toBeVisible();

  // "My courses" lists only the courses assigned to the tutor, not every course the office can see.
  const mine = await apiGet(page, "/course-offerings/?mine=true&page_size=100");
  const all = await apiGet(page, "/course-offerings/?page_size=1");
  expect(all.count).toBeGreaterThan(mine.count);
  await nav.getByRole("link", { name: "My courses" }).click();
  await page.waitForLoadState("networkidle");
  const listed = page.getByRole("link", { name: "Marks" });
  await expect(listed).toHaveCount(mine.results.length);
  for (const course of mine.results) await expect(page.getByText(course.course_code, { exact: true }).first()).toBeVisible();

  // The administrator ends it; the office's access goes, teaching stays.
  await login(page, ACCOUNTS.admin);
  await open(page, "/settings/appointments");
  await page.getByRole("row", { name: /Akua Teacher/ }).getByRole("button", { name: "End" }).click();
  await page.getByLabel("Reason").fill("End of term");
  await page.getByRole("button", { name: "End appointment" }).click();
  await expect(page.getByText("no longer holds the office")).toBeVisible();

  await open(page, "/audit");
  // Actions taken during the appointment record the capacity the tutor acted in.
  await expect(page.getByRole("cell", { name: `${TUTOR} as Lecturer, Results Officer` }).first()).toBeVisible();

  await login(page, TUTOR);
  await expect(nav.getByRole("link", { name: "My courses" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Result sheets" })).toHaveCount(0);
});
