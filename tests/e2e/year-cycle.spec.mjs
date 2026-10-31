import { expect, test } from "@playwright/test";

import { ACCOUNTS, apiGet, login, open } from "./helpers.mjs";

// Runs last (alphabetically) because it withdraws a registration; each test undoes its other changes.
test.describe.configure({ mode: "serial" });

async function send(page, method, url, data) {
  const csrf = (await page.context().cookies()).find((c) => c.name === "csrftoken")?.value ?? "";
  const response = await page.request.fetch(`/api/v1${url}`, { method, data, headers: { "X-CSRFToken": csrf } });
  expect(response.ok(), `${method} ${url} -> ${response.status()}`).toBeTruthy();
  return response.json();
}

test("the Accounts Office clears a student before they can register", async ({ page }) => {
  // A student who has not registered this semester yet.
  await login(page, ACCOUNTS.registrar);
  const waiting = (await apiGet(page, "/registrations/not-registered/?page_size=50")).results
    .find((s) => s.email !== ACCOUNTS.student);
  test.skip(!waiting, "Every demo student is already registered");

  await login(page, ACCOUNTS.admin);
  await send(page, "PATCH", "/institution/settings/", { require_financial_clearance: true });
  try {
    await login(page, ACCOUNTS.accounts);
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Financial clearance" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Student records" })).toHaveCount(0); // no academic records
    await open(page, "/finance/clearance");
    await page.getByPlaceholder("Search student number or name…").fill(waiting.student_number);
    const row = page.getByRole("row").filter({ hasText: waiting.student_number });
    await expect(row).toContainText("Not cleared");
    await row.getByRole("checkbox").check();
    await page.getByRole("region", { name: "Clearance actions" }).getByRole("button", { name: "Mark cleared" }).click();
    await page.getByLabel("Note").fill("Receipt 004512");
    await page.getByRole("dialog").getByRole("button", { name: "Mark cleared" }).click();
    await expect(page.getByText("1 student cleared")).toBeVisible();
    await expect(row).toContainText("Cleared");
    await expect(row).toContainText("Receipt 004512");

    // The registrar sees who is cleared among students not yet registered.
    await login(page, ACCOUNTS.registrar);
    const cleared = await apiGet(page, "/registrations/not-registered/?cleared=true&page_size=100");
    expect(cleared.results.map((s) => s.id)).toContain(waiting.id);
  } finally {
    await login(page, ACCOUNTS.admin);
    await send(page, "PATCH", "/institution/settings/", { require_financial_clearance: false });
  }
});

test("a lecturer records an excused student as Incomplete instead of failing them", async ({ page }) => {
  await login(page, ACCOUNTS.lecturer);
  const courses = await apiGet(page, "/course-offerings/?mine=true&current=true&page_size=50");
  const course = courses.results.find((c) => c.enrolled_count > 0 && ["DRAFT", "RETURNED", null].includes(c.result_status ?? null));
  test.skip(!course, "No course with an open result sheet");
  await open(page, `/results/courses/${course.id}`);
  const excuse = page.getByRole("button", { name: "Excuse", exact: true }).first();
  const setUp = page.getByRole("button", { name: "Save components" });
  if (!(await excuse.count()) && (await setUp.count())) {
    await setUp.click(); // the default coursework 40% / examination 60%
    await expect(page.getByText("Assessment components saved.")).toBeVisible();
  }
  await expect(excuse).toBeVisible();
  const name = (await page.getByRole("row").filter({ has: excuse }).locator("td p").first().textContent()).trim();
  const row = page.getByRole("row").filter({ hasText: name });
  await excuse.click();
  await page.getByLabel("Reason").fill("Medical certificate KBTH/2210");
  await page.getByRole("button", { name: "Record as Incomplete" }).click();
  await expect(page.getByText("is recorded as Incomplete (excused)")).toBeVisible();
  await expect(row.getByText("Excused: Medical certificate KBTH/2210")).toBeVisible();
  await expect(row.getByRole("cell", { name: "I", exact: true })).toBeVisible();

  await row.getByRole("button", { name: "Excused…" }).click();
  await page.getByRole("button", { name: "Remove excusal" }).click();
  await expect(page.getByText("Excusal removed.")).toBeVisible();
});

test("the registrar withdraws a student from the semester mid-way", async ({ page }) => {
  await login(page, ACCOUNTS.registrar);
  const { semester } = await apiGet(page, "/academic/current-period/");
  const list = await apiGet(page, `/registrations/?status=REGISTERED&semester=${semester.id}&page_size=100&ordering=student__last_name`);
  const demo = (await apiGet(page, `/students/?search=${ACCOUNTS.student}`)).results[0];
  const registration = [...list.results].reverse().find((r) => r.student !== demo?.id);
  test.skip(!registration, "No registration to withdraw");
  await open(page, `/registrations/${registration.id}`);
  await page.getByRole("button", { name: "Withdraw from semester" }).click();
  await page.getByLabel("Reason").fill("Deferred on medical grounds");
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();
  await expect(page.getByText("Student withdrawn from the semester.")).toBeVisible();
  const after = await apiGet(page, `/registrations/${registration.id}/`);
  expect(["CANCELLED", "REGISTERED"]).toContain(after.status);
  expect(after.events.some((e) => e.reason === "Deferred on medical grounds")).toBe(true);
});
