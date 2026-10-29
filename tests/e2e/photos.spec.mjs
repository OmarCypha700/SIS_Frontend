import { expect, test } from "@playwright/test";
import { zipSync } from "fflate";

import { ACCOUNTS, apiGet, login, open } from "./helpers.mjs";

// A valid 1x1 PNG; the server crops and resizes it like any photo.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const fileName = (number) => `${number.replaceAll("/", "-")}.png`;

test("registry bulk-imports student photos from files and a ZIP", async ({ page }) => {
  await login(page, ACCOUNTS.registrar);
  const students = (await apiGet(page, "/students/?page_size=3&ordering=student_number")).results;
  const [first, second, third] = students;

  await open(page, "/students/photos");
  const zip = Buffer.from(zipSync({ [`photos/${fileName(third.student_number)}`]: new Uint8Array(PNG) }));
  await page.getByLabel("Photos or ZIP file").setInputFiles([
    { name: fileName(first.student_number), mimeType: "image/png", buffer: PNG },
    { name: first.student_number.replaceAll("/", "").toLowerCase() + ".png", mimeType: "image/png", buffer: PNG },
    { name: second.student_number.replaceAll("/", "_") + ".png", mimeType: "image/png", buffer: PNG },
    { name: "NOT-A-STUDENT.png", mimeType: "image/png", buffer: PNG },
    { name: "class-photos.zip", mimeType: "application/zip", buffer: zip },
  ]);

  await expect(page.getByText("5 files")).toBeVisible();
  const row = (name) => page.getByRole("row").filter({ hasText: name });
  await expect(row(fileName(first.student_number))).toContainText("Duplicate"); // two files for one student
  await expect(row("NOT-A-STUDENT.png")).toContainText("No match");
  await expect(row(fileName(third.student_number))).toContainText(third.full_name); // from inside the ZIP

  await page.getByRole("button", { name: /^Upload \d+ photo/ }).click();
  await expect(page.getByText("Import finished")).toBeVisible();
  await expect(row(second.student_number.replaceAll("/", "_"))).toContainText("Uploaded");

  // The photo now shows on the student's record and in the list.
  await open(page, `/students/${second.id}`);
  await expect(page.getByRole("img", { name: `Photo of ${second.full_name}` })).toBeVisible();
  const photo = await page.request.get((await apiGet(page, `/students/${second.id}/`)).photo_url);
  expect(photo.headers()["content-type"]).toBe("image/webp");
});
