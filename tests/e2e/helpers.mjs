import { expect } from "@playwright/test";

// Fictitious accounts created by the backend's `seed_demo` command.
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "Demo-Password-2026";
export const ACCOUNTS = {
  admin: "admin@northridge.example",
  registrar: "registrar@northridge.example",
  officer: "exams@northridge.example",
  lecturer: "lecturer@northridge.example",
  student: "student@northridge.example",
};

/** Navigate and wait until the page is interactive (hydrated and idle) before using it. */
export async function open(page, url) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

export async function login(page, email, password = DEMO_PASSWORD) {
  await page.context().clearCookies();
  await open(page, "/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Sign-in hashes the password and the next page loads the session on the server; allow for a busy test machine.
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /Welcome/ })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

/** JSON from the API using the page's session cookie. */
export async function apiGet(page, url) {
  const response = await page.request.get(`/api/v1${url}`);
  expect(response.ok(), `${url} -> ${response.status()}`).toBeTruthy();
  return response.json();
}
