import { expect, test } from "@playwright/test";

import { ACCOUNTS, apiGet, login, open } from "./helpers.mjs";

test.describe.configure({ mode: "serial" });

const csv = (name, text) => ({ name, mimeType: "text/csv", buffer: Buffer.from(text, "utf-8") });

test("admin sidebar scrolls to every menu item and groups collapse", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 640 });
  await login(page, ACCOUNTS.admin);
  const nav = page.getByRole("navigation", { name: "Main" });
  const scrollable = await nav.evaluate((el) => el.scrollHeight > el.clientHeight && getComputedStyle(el).overflowY === "auto");
  expect(scrollable).toBe(true);
  await nav.getByRole("link", { name: "Audit log" }).click();
  await expect(page).toHaveURL(/\/audit$/);
  await expect(nav.getByRole("link", { name: "Audit log" })).toBeInViewport();

  await nav.getByRole("button", { name: "Academics" }).click();
  await expect(nav.getByRole("link", { name: "Departments" })).toHaveCount(0);
  await page.reload();
  await expect(nav.getByRole("link", { name: "Departments" })).toHaveCount(0); // remembered
  await nav.getByRole("button", { name: "Academics" }).click();
  await expect(nav.getByRole("link", { name: "Departments" })).toBeVisible();
});

test("desktop sidebar collapses to an icon rail and remembers it", async ({ page }) => {
  const hydrationErrors = [];
  page.on("pageerror", (error) => {
    if (/Hydration|#418/.test(error.message)) hydrationErrors.push(error.message);
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, ACCOUNTS.admin);
  await open(page, "/students");
  const sidebar = page.locator("aside");
  const main = page.locator("main");
  const wideMain = (await main.boundingBox()).width;

  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(sidebar).toHaveJSProperty("offsetWidth", 64);
  expect((await main.boundingBox()).width).toBeGreaterThan(wideMain);
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("link", { name: "Audit log" }).hover();
  await expect(page.getByRole("tooltip", { name: "Audit log" })).toBeVisible();
  await nav.getByRole("link", { name: "Audit log" }).click();
  await expect(page).toHaveURL(/\/audit$/);

  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(sidebar).toHaveJSProperty("offsetWidth", 64); // rendered collapsed by the server
  await page.locator("body").press("Control+b");
  await expect(page.getByRole("button", { name: "Collapse sidebar" })).toBeVisible();
  await expect(sidebar).toHaveJSProperty("offsetWidth", 256);
  expect(hydrationErrors).toEqual([]);
});

test("student records export to Excel and a registration slip downloads as PDF", async ({ page }) => {
  await login(page, ACCOUNTS.registrar);
  await open(page, "/students");
  await page.getByRole("button", { name: "Export" }).click();
  const [excel] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: /Excel/ }).click()]);
  expect(excel.suggestedFilename()).toBe("students.xlsx");

  const registration = (await apiGet(page, "/registrations/?page_size=1")).results[0];
  await open(page, `/registration/slip/${registration.id}`);
  const [pdf] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download PDF" }).click()]);
  expect(pdf.suggestedFilename()).toMatch(/^registration-slip-.+\.pdf$/);
});

test("lecturer imports marks from a spreadsheet", async ({ page }) => {
  await login(page, ACCOUNTS.lecturer);
  const offerings = (await apiGet(page, "/course-offerings/?current=true&page_size=50")).results;
  const target = offerings.find((o) => o.enrolled_count > 0 && !["SUBMITTED", "APPROVED", "PUBLISHED"].includes(o.result_status));
  expect(target, "the demo lecturer has an open course with students").toBeTruthy();
  const classList = await apiGet(page, `/class-lists/${target.id}/`);

  await open(page, `/results/courses/${target.id}`);
  await expect(page.getByRole("heading", { name: new RegExp(target.course_code) })).toBeVisible();
  const save = page.getByRole("button", { name: "Save components" });
  if (await save.isVisible()) {
    await save.click();
    await expect(page.getByText("Assessment components saved.")).toBeVisible();
  }
  await page.getByRole("button", { name: "Import marks" }).click();
  const dialog = page.getByRole("dialog");
  const rows = classList.students.map((s, i) => `${s.student_number},${i === 0 ? 99 : 30},${70}`).join("\n");
  await dialog.getByLabel("Marks file").setInputFiles(
    csv("marks.csv", `Student Number,Continuous assessment (/40),Final examination (/100)\n${rows}\nNOT-REAL,10,10\n`),
  );
  await dialog.getByRole("button", { name: "Check file" }).click();
  await expect(dialog.getByText("This student is not registered for this course.")).toBeVisible();
  await expect(dialog.getByText(/outside 0–40/)).toBeVisible();
  const expected = (classList.students.length - 1) * 2;
  await dialog.getByRole("button", { name: `Apply ${expected} change(s)` }).click();
  await expect(page.getByText(`${expected} mark(s) imported.`, { exact: false })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: new RegExp(`^Final examination for ${classList.students[1].full_name}`) })).toHaveValue("70");
});

test("admin imports courses and staff accounts", async ({ page }) => {
  await login(page, ACCOUNTS.admin);
  await open(page, "/academics/courses/import");
  await page.getByLabel("CSV or Excel file").setInputFiles(csv("courses.csv",
    "code,title,credits,department_code,prerequisites,programme_code,level,term_number,category\n" +
    "ITC301,Software Engineering,3,CS,ITC201,CS-BAC,Level 300,1,COMPULSORY\n" +
    "ITC302,Mobile Development,3,CS,ITC301,,,,\n" +
    "ITC101,Duplicate,3,CS,,,,,\n"));
  await page.getByRole("button", { name: "Check file" }).click();
  await expect(page.getByText("A course with this code already exists.")).toBeVisible();
  await page.getByRole("button", { name: "Import 2 row(s)" }).click();
  await expect(page.getByText("2 course(s) created, 1 curriculum placement(s).").first()).toBeVisible();

  await open(page, "/settings/users/import");
  await page.getByLabel("CSV or Excel file").setInputFiles(csv("staff.csv",
    "email,title,first_name,last_name,staff_id,role\n" +
    "kwesi.new@northridge.example,Mr.,Kwesi,Newman,STF-500,Lecturer\n" +
    "admin@northridge.example,,Dup,Licate,,ADMIN\n"));
  await page.getByRole("button", { name: "Check file" }).click();
  await expect(page.getByText("An account with this email already exists.")).toBeVisible();
  await page.getByRole("button", { name: "Create 1 row(s)" }).click();
  await expect(page.getByText(/1 account\(s\) created\. Print or download the temporary passwords below\./).first()).toBeVisible();
  const users = await apiGet(page, "/users/?search=kwesi.new");
  expect(users.results[0].role).toBe("LECTURER");

  // The one-time list of temporary passwords downloads as CSV.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download CSV" }).click(),
  ]);
  const sheet = (await (await download.createReadStream()).toArray()).join("");
  const temporary = sheet.trim().split(/\r?\n/)[1].split(",").at(-1);
  expect(temporary).toMatch(/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/);

  // First sign-in: nothing else is available until the person chooses their own password,
  // and a crafted ?next= cannot send them to another site.
  await page.context().clearCookies();
  await open(page, "/login?next=%2F%5Cevil.example");
  await page.getByLabel("Email").fill("kwesi.new@northridge.example");
  await page.getByLabel("Password").fill(temporary);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Welcome, Kwesi" })).toBeVisible();
  const blocked = await page.request.get("/api/v1/notifications/unread-count/");
  expect(blocked.status()).toBe(403);
  await page.getByLabel("Temporary password").fill(temporary);
  await page.getByLabel("New password", { exact: true }).fill("Kwesi-Own-Secret-2026");
  await page.getByLabel("Confirm new password").fill("Kwesi-Own-Secret-2026");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Password changed.")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel("Temporary password")).toBeHidden();
  expect((await page.request.get("/api/v1/notifications/unread-count/")).status()).toBe(200);
});
