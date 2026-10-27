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
};

rmSync(dbPath, { force: true });
const manage = (...args) => execFileSync(python, [path.join(backendDir, "manage.py"), ...args], { env, stdio: "inherit", cwd: backendDir });
manage("migrate", "--noinput", "-v", "0");
manage("seed_demo", "--students", "16");

const server = spawn(python, [path.join(backendDir, "manage.py"), "runserver", `127.0.0.1:${port}`, "--noreload"], {
  env,
  stdio: "inherit",
  cwd: backendDir,
});
const stop = () => server.kill();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
process.on("exit", stop);
