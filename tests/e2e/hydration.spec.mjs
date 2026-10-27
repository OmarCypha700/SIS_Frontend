import { expect, test } from "@playwright/test";

import { ACCOUNTS, login, open } from "./helpers.mjs";

const HYDRATION = /Hydration failed|hydration mismatch|Minified React error #(418|423|425)/i;

const PAGES = {
  admin: ["/dashboard", "/students", "/academics/courses", "/results/sheets", "/settings/regulations", "/audit"],
  lecturer: ["/dashboard", "/results/courses"],
  student: ["/dashboard", "/registration", "/my-results"],
};

for (const [role, pages] of Object.entries(PAGES)) {
  test(`server-rendered pages hydrate cleanly for ${role}`, async ({ page }) => {
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error" && HYDRATION.test(message.text())) errors.push(message.text().slice(0, 300));
    });
    page.on("pageerror", (error) => {
      if (HYDRATION.test(error.message)) errors.push(error.message.slice(0, 300));
    });
    // A remembered collapsed menu group must not make the server and browser render differently.
    await page.addInitScript(() => {
      window.localStorage.setItem("sis.sidebar.collapsed", JSON.stringify(["Students", "Results", "My studies"]));
    });
    await login(page, ACCOUNTS[role]);
    for (const path of pages) await open(page, path);
    expect(errors).toEqual([]);
  });
}
