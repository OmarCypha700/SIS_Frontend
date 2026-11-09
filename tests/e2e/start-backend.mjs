// Starts Django for end-to-end tests on a fresh SQLite database filled by `seed_demo`.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const backendDir = process.env.SIS_BACKEND_DIR || path.resolve(process.cwd(), "..", "SIS Backend");
const python =
  process.env.SIS_PYTHON ||
  [path.join(backendDir, ".venv", "Scripts", "python.exe"), path.join(backendDir, ".venv", "bin", "python")].find(existsSync) ||
  "python";
const dbPath = path.join(backendDir, "e2e.sqlite3");
const port = process.env.E2E_BACKEND_PORT || "8100";

const env = {
  ...process.env,
  DJANGO_SETTINGS_MODULE: "config.settings.dev",
  DATABASE_URL: "",
  SQLITE_PATH: dbPath,
  THROTTLE_LOGIN: "1000/min",
  CSRF_TRUSTED_ORIGINS: "http://localhost:3100,http://127.0.0.1:3100",
  DJANGO_DEBUG: "True",
  // Online fee payment against the fake gateway in fake-paystack.mjs, never the real Paystack.
  PAYSTACK_SECRET_KEY: "sk_test_e2e",
  PAYSTACK_BASE_URL: "http://127.0.0.1:8199",
  FRONTEND_URL: "http://localhost:3100",
};

rmSync(dbPath, { force: true });
const manage = (...args) => execFileSync(python, [path.join(backendDir, "manage.py"), ...args], { env, stdio: "inherit", cwd: backendDir });

// Fresh push keys for this run only (never stored), so push counts as set up and the app offers it.
const keys = execFileSync(python, [path.join(backendDir, "manage.py"), "generate_vapid_keys"], { env, cwd: backendDir })
  .toString();
for (const line of keys.split(/\r?\n/)) {
  const match = line.match(/^(VAPID_(?:PUBLIC_KEY|PRIVATE_KEY))=(.+)$/);
  if (match) env[match[1]] = match[2];
}
env.VAPID_SUBJECT = "mailto:e2e@example.test";
manage("migrate", "--noinput", "-v", "0");
manage("seed_demo", "--students", "16");

const server = spawn(python, [path.join(backendDir, "manage.py"), "runserver", `127.0.0.1:${port}`, "--noreload"], {
  env,
  stdio: "inherit",
  cwd: backendDir,
});
const gateway = spawn(process.execPath, [path.join(import.meta.dirname, "fake-paystack.mjs")], { stdio: "inherit" });
const stop = () => {
  server.kill();
  gateway.kill();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
process.on("exit", stop);
