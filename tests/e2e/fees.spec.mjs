import { expect, test } from "@playwright/test";

import { ACCOUNTS, apiGet, login, open } from "./helpers.mjs";

// Online payments go to the fake gateway in fake-paystack.mjs (see start-backend.mjs): no real money.
test.describe.configure({ mode: "serial" });

async function send(page, method, url, data) {
  const csrf = (await page.context().cookies()).find((c) => c.name === "csrftoken")?.value ?? "";
  const response = await page.request.fetch(`/api/v1${url}`, { method, data, headers: { "X-CSRFToken": csrf } });
  expect(response.ok(), `${method} ${url} -> ${response.status()}`).toBeTruthy();
  return response.json();
}

test("the Accounts Office sets up fees and previews billing a class", async ({ page }) => {
  await login(page, ACCOUNTS.accounts);
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Fee schedules" })).toBeVisible();
  await open(page, "/finance/fees");
  await expect(page.getByRole("row").filter({ hasText: "Level 100" }).first()).toBeVisible();

  await page.getByRole("button", { name: "New fee schedule" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Programme").selectOption({ index: 1 });
  await dialog.getByLabel("Level").selectOption({ label: "Level 400" });
  const { semester } = await apiGet(page, "/academic/current-period/");
  await dialog.getByLabel("Academic year").selectOption(String(semester.academic_year));
  await dialog.getByLabel("Semester").selectOption(String(semester.id));
  await dialog.getByLabel("Item 1 amount").fill("2500");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Fee schedule added.")).toBeVisible();

  const seeded = page.getByRole("row").filter({ hasText: "Level 100" }).first();
  await seeded.getByRole("button", { name: "Bill" }).click();
  await expect(page.getByRole("dialog").getByText(/^Preview:/)).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
});

test("a student pays online, gets a receipt and is cleared to register", async ({ page }) => {
  await login(page, ACCOUNTS.admin);
  await send(page, "PATCH", "/institution/settings/", { require_financial_clearance: true, online_payments_enabled: true });
  try {
    await login(page, ACCOUNTS.student);
    await open(page, "/registration");
    await expect(page.getByText(/Pay at least GHS [\d,.]+ more to register/)).toBeVisible();
    await page.getByRole("link", { name: "Pay fees" }).click();
    await expect(page).toHaveURL(/\/fees$/);
    await expect(page.getByText("To pay to register", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Pay now" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Transaction fee")).toBeVisible();
    await dialog.getByRole("button", { name: /^Pay GHS/ }).click();
    // The fake gateway sends the student straight back, as Paystack does after a successful payment.
    await expect(page).toHaveURL(/\/fees\/return\?/);
    await expect(page.getByText("Payment received")).toBeVisible();
    await expect(page.getByText("You have paid enough to register for this semester.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Download receipt" })).toBeVisible();

    await page.getByRole("link", { name: "Register courses" }).click();
    await expect(page.getByRole("heading", { name: "Course registration" })).toBeVisible();
    await expect(page.getByText("Financial clearance required")).toHaveCount(0);
  } finally {
    await login(page, ACCOUNTS.admin);
    await send(page, "PATCH", "/institution/settings/", { require_financial_clearance: false, online_payments_enabled: false });
  }
});

test("the Accounts Office records a bank payment on a student's account", async ({ page }) => {
  await login(page, ACCOUNTS.accounts);
  const owing = (await apiGet(page, "/student-accounts/?owing=true&page_size=50")).results.find((s) => s.student_number);
  test.skip(!owing, "No student owes fees");
  await open(page, `/finance/accounts/${owing.id}`);
  await page.getByRole("button", { name: "Record payment" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Amount (GHS)").fill("100");
  await dialog.getByLabel("Bank slip or receipt number").fill(`E2E-${Date.now()}`);
  await dialog.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText("Payment recorded.")).toBeVisible();
  await expect(page.getByText(/^Payment NCHT\/RCP\//).first()).toBeVisible();

  await open(page, "/finance/payments");
  await expect(page.getByText("Collected today")).toBeVisible();
  // Today's payments only; the export then downloads just those.
  const today = new Date().toISOString().slice(0, 10);
  await page.getByLabel("Paid from").fill(today);
  await page.getByLabel("to", { exact: true }).fill(today);
  await expect(page.getByRole("button", { name: "Export filtered" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: owing.student_number }).first()).toBeVisible();
});

test("a bank statement is previewed, a possible duplicate is held back, and the rest is recorded", async ({ page }) => {
  await login(page, ACCOUNTS.accounts);
  // The payment recorded by hand in the previous test, and another student who still owes fees.
  const earlier = (await apiGet(page, "/payments/?search=E2E-&page_size=1")).results[0];
  const second = (await apiGet(page, "/student-accounts/?owing=true&page_size=50")).results
    .find((s) => s.id !== earlier?.student);
  test.skip(!earlier || !second, "Needs the previous test's payment and another student who owes");
  const first = { student_number: earlier.student_number };
  // The first student's 100.00 from the previous test was recorded by hand today; the bank shows it again
  // under its own number. The second row is a genuinely new payment.
  const today = new Date().toISOString().slice(0, 10);
  const stamp = Date.now();
  const csv = [
    "student_number,amount,reference,date",
    `${first.student_number},100.00,BANK-${stamp}-1,${today}`,
    `${second.student_number},250.00,BANK-${stamp}-2,${today}`,
    `NOT/A/STUDENT,50.00,BANK-${stamp}-3,${today}`,
  ].join("\n");

  await open(page, "/finance/payments");
  await page.getByRole("button", { name: "Import bank statement" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("File").setInputFiles({ name: "statement.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await dialog.getByRole("button", { name: "Check file" }).click();
  await expect(dialog.getByText("Student not found")).toBeVisible();
  const newRow = dialog.getByRole("checkbox", { name: new RegExp(`BANK-${stamp}-2`) });
  await expect(newRow).toBeChecked();
  const duplicate = dialog.getByRole("checkbox", { name: new RegExp(`BANK-${stamp}-1`) });
  // Recorded by hand in the previous test: same student, amount and day under another reference.
  await expect(dialog.getByText("Possible duplicate", { exact: true })).toBeVisible();
  await expect(duplicate).not.toBeChecked();
  await dialog.getByRole("button", { name: /^Record 1 payment/ }).click();
  await expect(dialog.getByText("1 payment recorded")).toBeVisible();
});
