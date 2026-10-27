import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a throw-away backend database seeded with fictitious demo
 * data (see tests/e2e/start-backend.mjs) and a production build of the frontend.
 *
 *   npx playwright test
 *
 * Set SIS_BACKEND_DIR if the Django project is not in ../SIS Backend.
 */
const BACKEND_PORT = 8100;
const FRONTEND_PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/e2e/start-backend.mjs",
      url: `http://127.0.0.1:${BACKEND_PORT}/api/v1/institution/`,
      env: { E2E_BACKEND_PORT: String(BACKEND_PORT) },
      timeout: 180_000,
      reuseExistingServer: false,
    },
    {
      command: `npm run build && npx next start -p ${FRONTEND_PORT}`,
      url: `http://localhost:${FRONTEND_PORT}/login`,
      env: { BACKEND_URL: `http://127.0.0.1:${BACKEND_PORT}`, NEXT_DIST_DIR: ".next-e2e" },
      timeout: 300_000,
      reuseExistingServer: false,
    },
  ],
});
