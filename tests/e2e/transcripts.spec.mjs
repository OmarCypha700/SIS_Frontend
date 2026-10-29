import { expect, test } from "@playwright/test";

import { ACCOUNTS, apiGet, login, open } from "./helpers.mjs";

/** A seeded student who has published results. */
async function studentWithResults(page) {
  const students = (await apiGet(page, "/students/?page_size=60&status=ACTIVE")).results;
  for (const student of students) {
    const preview = await apiGet(page, `/transcripts/preview/?student=${student.id}`);
    if (preview.can_issue) return student;
  }
  throw new Error("No seeded student has published results");
}

test("administrator issues, verifies and revokes an official transcript", async ({ page, browser }) => {
  await login(page, ACCOUNTS.admin);
  const student = await studentWithResults(page);
  await open(page, `/students/${student.id}`);
  await page.getByRole("tab", { name: "Academic record" }).click();
  await page.getByRole("button", { name: "Issue official transcript" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("This will be an interim transcript")).toBeVisible();
  await expect(dialog.getByRole("radio", { name: /uploaded signature and seal/ })).toBeDisabled();
  await dialog.getByLabel("Purpose or addressed to").fill("Graduate application – test university");
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Issue and download" }).click();
  expect((await download).suggestedFilename()).toMatch(/^transcript-.+\.pdf$/);
  await expect(page.getByText(/Transcript .+ issued\./)).toBeVisible();

  const issued = (await apiGet(page, `/transcripts/?student=${student.id}`)).results[0];
  expect(issued.print_count).toBe(1);
  await open(page, "/transcripts");
  await expect(page.getByRole("cell", { name: new RegExp(`^${issued.serial}`) })).toBeVisible();

  // Anyone can verify, without signing in.
  const visitor = await browser.newPage();
  await visitor.goto(`/verify/${issued.verification_code.replace("-", "")}`);
  await expect(visitor.getByRole("heading", { name: "Valid transcript" })).toBeVisible();
  await expect(visitor.getByText(issued.serial)).toBeVisible();

  // Revoke from the register; the verification page then says so.
  await page.getByRole("button", { name: `Actions for ${issued.serial}` }).click();
  await page.getByRole("menuitem", { name: "Revoke" }).click();
  await page.getByRole("alertdialog").getByLabel("Reason").fill("Issued in error during testing");
  await page.getByRole("alertdialog").getByRole("button", { name: "Revoke transcript" }).click();
  await expect(page.getByText(`${issued.serial} revoked.`)).toBeVisible();
  await visitor.reload();
  await expect(visitor.getByRole("heading", { name: "This transcript has been revoked" })).toBeVisible();
  await visitor.goto("/verify/AAAAABBBBB");
  await expect(visitor.getByRole("heading", { name: "No matching transcript" })).toBeVisible();
  await visitor.close();
});

test("registrars need an administrator's permission to issue", async ({ page }) => {
  await login(page, ACCOUNTS.registrar);
  const student = await studentWithResults(page);
  await open(page, `/students/${student.id}`);
  await page.getByRole("tab", { name: "Academic record" }).click();
  await expect(page.getByText("Official transcripts")).toBeVisible();
  await expect(page.getByRole("button", { name: "Issue official transcript" })).toHaveCount(0);
  await open(page, "/transcripts");
  await expect(page.getByText("Issuing, reprinting and revoking need permission from an administrator.")).toBeVisible();
});
