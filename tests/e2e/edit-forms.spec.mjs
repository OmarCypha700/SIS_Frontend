import { expect, test } from "@playwright/test";

import { ACCOUNTS, apiGet, login, open } from "./helpers.mjs";

test("editing a course offering keeps its course and semester selected", async ({ page }) => {
  await login(page, ACCOUNTS.registrar);
  // An offering in the current semester: offerings in a closed semester cannot be changed.
  const { semester: current } = await apiGet(page, "/academic/current-period/");
  const { academic_year_name: year, name } = await apiGet(page, `/semesters/${current.id}/`);
  await open(page, "/academics/offerings");
  const row = page.getByRole("row").filter({ hasText: `${year} ${name}` })
    .filter({ has: page.getByRole("button", { name: /^Actions for / }) }).first();
  const courseCode = (await row.locator("td").first().locator("span.font-medium").textContent()).trim();
  await row.getByRole("button", { name: /^Actions for / }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();

  const dialog = page.getByRole("dialog", { name: "Edit offering" });
  const course = dialog.getByLabel("Course");
  // The saved choices appear once the lists have loaded; nothing has to be picked again.
  await expect(course).not.toHaveValue("");
  await expect(course.locator("option:checked")).toContainText(courseCode);
  await expect(dialog.getByLabel("Semester")).not.toHaveValue("");

  await dialog.getByLabel("Capacity").fill("80");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved.")).toBeVisible();
});
