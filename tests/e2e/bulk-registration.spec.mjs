import { expect, test } from "@playwright/test";

import { ACCOUNTS, apiGet, login, open } from "./helpers.mjs";

test.describe.configure({ mode: "serial" });

test("the registrar previews and registers a whole class at once", async ({ page }) => {
  await login(page, ACCOUNTS.registrar);
  // A class in the demo data with students not yet registered this semester.
  const waiting = await apiGet(page, "/registrations/not-registered/?page_size=1");
  expect(waiting.count).toBeGreaterThan(0);
  const { programme_code: programme, level_name: level } = waiting.results[0];

  await open(page, "/registrations/bulk");
  const programmeSelect = page.getByLabel("Programme");
  const programmeValue = await programmeSelect.locator("option", { hasText: `${programme} ·` }).getAttribute("value");
  await programmeSelect.selectOption(programmeValue);
  await page.getByLabel("Level").selectOption({ label: level });
  await page.getByRole("button", { name: "Load students" }).click();
  await expect(page.getByText("Compulsory for this level")).toBeVisible();
  // Leave the demo student out: another journey has them register themselves.
  const demo = (await apiGet(page, `/students/?search=${ACCOUNTS.student}`)).results[0];
  const include = page.getByRole("checkbox", { name: `Include ${demo.full_name}` });
  if (await include.count()) await include.uncheck();

  await page.getByRole("button", { name: /^Preview \d+ students$/ }).click();
  await expect(page.getByText("Preview", { exact: true })).toBeVisible({ timeout: 60_000 });
  const ready = page.getByRole("row").filter({ hasText: "Ready" });
  const readyCount = await ready.count();
  expect(readyCount).toBeGreaterThan(0);
  const before = (await apiGet(page, "/registrations/not-registered/?page_size=1")).count;
  expect(before).toBe(waiting.count); // the preview saved nothing

  await page.getByLabel("Reason").fill(`${programme} ${level}, current semester`);
  await page.getByRole("button", { name: `Register ${readyCount} students` }).click();
  await expect(page.getByText(`${readyCount} student${readyCount === 1 ? "" : "s"} registered`).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("row").filter({ hasText: "Ready" })).toHaveCount(0);

  const after = (await apiGet(page, "/registrations/not-registered/?page_size=1")).count;
  expect(after).toBeLessThan(before);

  // The Registrations page offers approving or rejecting several at once.
  await open(page, "/registrations");
  await expect(page.getByRole("link", { name: "Bulk registration" }).first()).toBeVisible();
  await page.getByRole("checkbox", { name: /Select/ }).nth(1).check();
  await expect(page.getByRole("region", { name: "Bulk actions" }).getByRole("button", { name: "Approve" })).toBeVisible();
});
