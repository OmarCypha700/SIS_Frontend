import { expect, test } from "@playwright/test";

import { ACCOUNTS, apiGet, login, open } from "./helpers.mjs";

test.describe.configure({ mode: "serial" });

// Seeded demo lecturers, by display name.
const LECTURER_EMAILS = {
  "Dr. Yaw Lecturer": "lecturer@northridge.example",
  "Mrs. Akua Teacher": "lecturer2@northridge.example",
  "Mr. Nii Tutor": "lecturer3@northridge.example",
};

async function confirmDialog(page, button, reason) {
  const dialog = page.getByRole("alertdialog");
  if (reason) await dialog.getByRole("textbox").fill(reason);
  await dialog.getByRole("button", { name: button }).click();
}

test("administrator configures academic regulations", async ({ page }) => {
  await login(page, ACCOUNTS.admin);
  await open(page, "/settings/regulations");
  await page.getByLabel("Offer resits for failed courses").check();
  await page.getByLabel("Highest grade point a resit can earn").fill("2.00");
  await page.getByLabel("Probation when CGPA is below").fill("2.00");
  await page.getByLabel("Dismissal CGPA threshold").fill("1.00");
  await page.getByRole("button", { name: "Save regulations" }).click();
  await expect(page.getByText("Academic regulations saved.")).toBeVisible();

  // Dismissal threshold above probation is rejected.
  await page.getByLabel("Dismissal CGPA threshold").fill("3.00");
  await page.getByRole("button", { name: "Save regulations" }).click();
  await expect(page.getByText("The dismissal threshold cannot be above the probation threshold.")).toBeVisible();
});

test("a failed student resits and the capped grade is published", async ({ page }) => {
  await login(page, ACCOUNTS.officer);
  const published = (await apiGet(page, "/result-sheets/?status=PUBLISHED&page_size=50")).results;
  let target = null;
  for (const sheet of published) {
    const detail = await apiGet(page, `/result-sheets/${sheet.id}/`);
    if (detail.summary.failed > 0) {
      target = detail;
      break;
    }
  }
  expect(target, "seed data contains a published course with a failure").not.toBeNull();

  // The officer opens the resit from the published result sheet.
  await open(page, `/results/sheets/${target.id}`);
  await page.getByRole("button", { name: "Open resit" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Open resit" }).click();
  await expect(page).toHaveURL(/\/results\/resits\/\d+$/);
  const resitUrl = page.url();
  const resitId = resitUrl.split("/").pop();

  // The registry registers the first eligible student (for example after the deadline).
  await login(page, ACCOUNTS.registrar);
  await open(page, resitUrl);
  await page.getByRole("checkbox", { name: /^Select / }).first().check();
  await page.getByRole("button", { name: /Register selected/ }).click();
  await confirmDialog(page, "Register", "Student was ill on the registration day");
  await expect(page.getByText("Students registered for the resit.")).toBeVisible();

  // The assigned lecturer enters a high score and submits.
  const lecturerEmail = LECTURER_EMAILS[target.lecturers[0]];
  await login(page, lecturerEmail);
  await open(page, resitUrl);
  await page.getByRole("spinbutton", { name: /Resit score for/ }).first().fill("95");
  await page.getByRole("button", { name: /Save scores/ }).click();
  await expect(page.getByText(/score\(s\) saved/)).toBeVisible();
  await expect(page.getByText("capped").first()).toBeVisible();
  await page.getByRole("button", { name: "Submit for review" }).click();
  await confirmDialog(page, "Submit");
  await expect(page.getByText("Resit scores submitted for review.")).toBeVisible();

  await login(page, ACCOUNTS.officer);
  await open(page, resitUrl);
  await page.getByRole("button", { name: "Approve" }).click();
  await confirmDialog(page, "Approve");
  await expect(page.getByText("Resit scores approved.")).toBeVisible();

  await login(page, ACCOUNTS.registrar);
  await open(page, resitUrl);
  await page.getByRole("button", { name: "Publish" }).click();
  await confirmDialog(page, "Publish");
  await expect(page.getByText(/Resit results published/)).toBeVisible();

  const resit = await apiGet(page, `/resit-sheets/${resitId}/`);
  const done = resit.rows.find((r) => r.status === "COMPLETED");
  // 95% on the exam is an A, but the regulations cap resit grades at 2.00 grade points (C).
  expect(done.new_grade).toBe("C");
  expect(resit.rows.filter((r) => r.status === "NOT_TAKEN").length).toBe(resit.rows.length - 1);
});

test("progression review is prepared, overridden and applied by the registry", async ({ page }) => {
  await login(page, ACCOUNTS.registrar);
  await open(page, "/progression");
  await page.getByRole("button", { name: "New review" }).click();
  const dialog = page.getByRole("dialog");
  const semesterSelect = dialog.getByRole("combobox", { name: "Semester" });
  const firstSemester = await semesterSelect.locator("option").filter({ hasText: /First Semester/ }).last().getAttribute("value");
  await semesterSelect.selectOption(firstSemester);
  await dialog.getByRole("button", { name: "Prepare review" }).click();
  await expect(page).toHaveURL(/\/progression\/\d+$/);
  await expect(page.getByText("Draft: nothing has been changed on any student record yet.")).toBeVisible();

  // Change one outcome; a reason is required.
  await page.getByRole("button", { name: /^Actions for / }).first().click();
  await page.getByRole("menuitem", { name: "Change outcome" }).click();
  const override = page.getByRole("dialog");
  await override.getByRole("combobox", { name: "Placement" }).selectOption("REPEAT");
  await expect(override.getByRole("button", { name: "Save" })).toBeDisabled();
  await override.getByRole("textbox", { name: "Reason" }).fill("Academic Board decision");
  await override.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Registry: Academic Board decision")).toBeVisible();

  await page.getByRole("button", { name: "Apply review" }).click();
  await confirmDialog(page, "Apply review");
  await expect(page.getByText(/Applied to \d+ student/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply review" })).toHaveCount(0);

  // Students cannot reach progression reviews.
  await login(page, ACCOUNTS.student);
  expect((await page.request.get("/api/v1/progression-reviews/")).status()).toBe(403);
});

test("administrator loads the Health Training Institutions preset", async ({ page }) => {
  await login(page, ACCOUNTS.admin);
  await open(page, "/settings/regulations");
  await page.getByRole("combobox", { name: "Preset" }).selectOption("health_training_institutions");
  await page.getByRole("button", { name: "Load into form" }).click();
  await expect(page.getByText("Not saved yet")).toBeVisible();
  await expect(page.getByLabel("Minimum CGPA to proceed")).toHaveValue("1.50");
  await expect(page.getByLabel("Most referred courses a student may carry forward")).toHaveValue("2");
  await expect(page.getByLabel("When referred courses are more than")).toHaveValue("3");
  await expect(page.getByLabel("Probation when CGPA is below")).toHaveValue("");

  // Nothing is stored until the administrator saves.
  expect((await apiGet(page, "/academic-regulations/")).promotion_min_cgpa).toBeNull();
  await page.getByRole("button", { name: "Save regulations" }).click();
  await expect(page.getByText("Academic regulations saved.")).toBeVisible();
  const saved = await apiGet(page, "/academic-regulations/");
  expect(saved.promotion_min_cgpa).toBe("1.50");
  expect(saved.dismissal_cgpa_inclusive).toBe(true);
  expect(saved.dismissal_status).toBe("WITHDRAWN");
  expect(saved.dismiss_on_second_repeat).toBe(true);
});
