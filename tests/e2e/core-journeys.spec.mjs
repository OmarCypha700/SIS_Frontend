import { expect, test } from "@playwright/test";

import { ACCOUNTS, apiGet, DEMO_PASSWORD, login, open } from "./helpers.mjs";

test.describe.configure({ mode: "serial" });

test("unauthenticated visitors are sent to sign in", async ({ page }) => {
  await open(page, "/students");
  await expect(page).toHaveURL(/\/login\?next=%2Fstudents/);
  const api = await page.request.get("/api/v1/students/");
  expect([401, 403]).toContain(api.status());
});

test("wrong password shows a generic error", async ({ page }) => {
  await open(page, "/login");
  await page.getByLabel("Email").fill(ACCOUNTS.admin);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
});

test("administrator creates a student and sees validation errors", async ({ page }) => {
  await login(page, ACCOUNTS.admin);
  await open(page, "/students/new");
  await page.getByRole("button", { name: "Create student" }).click();
  await expect(page.getByText("First name is required.")).toBeVisible();

  await page.getByLabel("First name").fill("Esi");
  await page.getByLabel("Surname").fill("Testfield");
  await page.getByLabel("Email").fill("esi.testfield@example.test");
  await page.getByRole("combobox", { name: "Programme", exact: true }).selectOption({ index: 1 });
  await page.getByRole("combobox", { name: "Level", exact: true }).selectOption({ label: "Level 100" });
  await page.getByRole("button", { name: "Create student" }).click();
  await expect(page).toHaveURL(/\/students\/\d+$/);
  await expect(page.getByRole("heading", { name: "Esi Testfield" })).toBeVisible();

  await open(page, "/students");
  await page.getByLabel("Search").fill("Testfield");
  await expect(page.getByRole("cell", { name: "Esi Testfield" })).toBeVisible();
});

test("student registers for courses and gets a slip", async ({ page }) => {
  await login(page, ACCOUNTS.student);
  await open(page, "/registration");
  await expect(page.getByRole("heading", { name: "Compulsory courses" })).toBeVisible();
  await page.getByRole("button", { name: /Review registration/ }).click();
  await expect(page.getByText("Review your selection")).toBeVisible();
  await page.getByRole("button", { name: "Submit registration" }).click();
  await expect(page.getByText("Registration received")).toBeVisible();
  await page.getByRole("link", { name: "View registration slip" }).click();
  await expect(page.getByText("Course registration slip")).toBeVisible();

  // The student cannot reach staff pages or other students' records.
  await open(page, "/students");
  await expect(page.getByText("You do not have access to this page")).toBeVisible();
  expect((await page.request.get("/api/v1/students/1/")).status()).toBe(403);
});

test("marks are entered, approved, published and seen by the student", async ({ page }) => {
  // Lecturer enters marks for ITC101 (Level 100, taught by the demo lecturer) and submits.
  await login(page, ACCOUNTS.lecturer);
  const offerings = await apiGet(page, "/course-offerings/?search=ITC101&current=true");
  const offering = offerings.results[0];
  const classList = await apiGet(page, `/class-lists/${offering.id}/`);
  expect(classList.count).toBeGreaterThan(0);

  await open(page, `/results/courses/${offering.id}`);
  await expect(page.getByRole("heading", { name: /ITC101/ })).toBeVisible();
  await page.getByRole("button", { name: "Save components" }).click();
  await expect(page.getByText("Assessment components saved.")).toBeVisible();

  const inputs = page.getByRole("spinbutton", { name: / for / });
  const count = await inputs.count();
  expect(count).toBe(classList.count * 2);
  for (let i = 0; i < count; i++) {
    const label = await inputs.nth(i).getAttribute("aria-label");
    // Continuous assessment is out of 40, the exam out of 100.
    await inputs.nth(i).fill(label.startsWith("Continuous") ? "30" : "70");
  }
  await page.getByRole("button", { name: /Save draft/ }).click();
  await expect(page.getByText(/mark\(s\) saved/)).toBeVisible();

  await page.getByRole("button", { name: "Submit for review" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Results submitted for review.")).toBeVisible();
  // Lecturers have no approve/publish controls, and the API refuses them anyway.
  await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
  const sheetId = (await apiGet(page, `/result-sheets/?search=ITC101&status=SUBMITTED`)).results[0].id;
  const forbidden = await page.request.post(`/api/v1/result-sheets/${sheetId}/publish/`, {
    headers: { "X-CSRFToken": (await page.context().cookies()).find((c) => c.name === "csrftoken")?.value ?? "" },
  });
  expect(forbidden.status()).toBe(403);

  // Results officer approves.
  await login(page, ACCOUNTS.officer);
  await open(page, `/results/sheets/${sheetId}`);
  await page.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Results approved.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish" })).toHaveCount(0);

  // Registrar publishes.
  await login(page, ACCOUNTS.registrar);
  await open(page, `/results/sheets/${sheetId}`);
  await page.getByRole("button", { name: "Publish" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Results published to students.")).toBeVisible();

  // A student in the class sees the published grade (30/40*40 + 70/100*60 = 72 -> B).
  await login(page, classList.students[0].email, DEMO_PASSWORD);
  await open(page, "/my-results");
  const row = page.getByRole("row", { name: /ITC101/ });
  await expect(row).toBeVisible();
  await expect(row.getByRole("cell", { name: "B", exact: true })).toBeVisible();
});

test("lecturer cannot open a course they do not teach", async ({ page }) => {
  await login(page, ACCOUNTS.lecturer);
  const response = await page.request.get("/api/v1/course-offerings/?page_size=200");
  const mine = new Set((await response.json()).results.map((o) => o.id));
  await login(page, ACCOUNTS.admin);
  const all = (await apiGet(page, "/course-offerings/?page_size=200")).results;
  const other = all.find((o) => !mine.has(o.id));
  await login(page, ACCOUNTS.lecturer);
  expect((await page.request.get(`/api/v1/result-sheets/for-offering/${other.id}/`)).status()).toBe(404);
  await open(page, `/results/courses/${other.id}`);
  await expect(page.getByText("Course offering not found.")).toBeVisible();
});

test("mobile layout uses the navigation drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, ACCOUNTS.admin);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Student records" }).click();
  await expect(page).toHaveURL(/\/students$/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
});
