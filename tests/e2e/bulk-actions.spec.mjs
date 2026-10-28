import { expect, test } from "@playwright/test";

import { ACCOUNTS, apiGet, login, open } from "./helpers.mjs";

async function csrf(page) {
  return (await page.context().cookies()).find((c) => c.name === "csrftoken")?.value ?? "";
}

test("administrator bulk-deletes duplicates and is told which records were kept", async ({ page }) => {
  await login(page, ACCOUNTS.admin);
  const programme = (await apiGet(page, "/programmes/?page_size=1")).results[0];
  const levels = await apiGet(page, "/levels/");
  const level = (Array.isArray(levels) ? levels : levels.results).find((l) => l.name === "Level 100");
  for (const n of [1, 2]) {
    const created = await page.request.post("/api/v1/students/", {
      headers: { "X-CSRFToken": await csrf(page) },
      data: { first_name: "Dupe", last_name: `Importrow${n}`, email: `dupe${n}@example.test`, programme: programme.id,
              current_level: level.id, admission_year: 2026 },
    });
    expect(created.status()).toBe(201);
  }

  await open(page, "/students");
  await page.getByLabel("Search").fill("Importrow");
  await expect(page.getByRole("row")).toHaveCount(3); // header + the two duplicates, once the search applies
  await page.getByRole("checkbox", { name: "Select all on this page" }).click();
  const bar = page.getByRole("region", { name: "Bulk actions" });
  await expect(bar).toContainText("2 students selected");
  await bar.getByRole("button", { name: "Delete" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Reason").fill("Duplicates from the test import");
  await expect(dialog.getByRole("button", { name: "Delete (2)" })).toBeDisabled(); // must acknowledge first
  await dialog.getByRole("checkbox").click();
  await dialog.getByRole("button", { name: "Delete (2)" }).click();
  await expect(page.getByText("2 students deleted.")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Dupe Importrow1", exact: true })).toHaveCount(0);

  // A real student with registrations is skipped, with the reason, and stays selected.
  const real = (await apiGet(page, "/students/?search=student@northridge.example")).results[0];
  await page.getByLabel("Search").fill(real.student_number);
  await expect(page.getByRole("row")).toHaveCount(2);
  await page.getByRole("checkbox", { name: `Select ${real.student_number} ${real.full_name}` }).click();
  await bar.getByRole("button", { name: "Delete" }).click();
  await dialog.getByLabel("Reason").fill("Trying");
  await dialog.getByRole("checkbox").click();
  await dialog.getByRole("button", { name: "Delete (1)" }).click();
  await expect(page.getByRole("heading", { name: "1 student was skipped" })).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("Deactivate it instead");
  await page.getByRole("button", { name: "Close" }).first().click();
  await expect(bar).toContainText("1 student selected");
});

test("registrar can bulk change status but cannot delete", async ({ page }) => {
  await login(page, ACCOUNTS.registrar);
  await open(page, "/students");
  await page.getByRole("checkbox", { name: /^Select / }).first().click();
  const bar = page.getByRole("region", { name: "Bulk actions" });
  await expect(bar.getByRole("button", { name: "Change status" })).toBeVisible();
  await expect(bar.getByRole("button", { name: "Delete" })).toHaveCount(0);
});
