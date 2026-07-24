#!/usr/bin/env node
import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.PORT?.trim() || "3000";
const envPath = join(root, ".env.local");

function log(msg) {
  console.log(`[dev-local] ${msg}`);
}

function freePort(targetPort) {
  try {
    const pids = execSync(`lsof -ti :${targetPort}`, { encoding: "utf8" }).trim();
    if (!pids) return;
    for (const pid of pids.split("\n").filter(Boolean)) {
      try {
        process.kill(Number(pid), "SIGTERM");
      } catch {
        // already gone
      }
    }
    log(`freed port ${targetPort}`);
  } catch {
    // port already free
  }
}

function ensureAuthSecret() {
  if (!existsSync(envPath)) {
    const secret = randomBytes(32).toString("base64");
    appendFileSync(envPath, `AUTH_SECRET=${secret}\n`, "utf8");
    log("created .env.local with AUTH_SECRET");
    return;
  }
  const raw = readFileSync(envPath, "utf8");
  if (/^AUTH_SECRET=.+$/m.test(raw)) return;
  const secret = randomBytes(32).toString("base64");
  appendFileSync(envPath, `\nAUTH_SECRET=${secret}\n`, "utf8");
  log("added AUTH_SECRET to .env.local");
}

freePort(port);
ensureAuthSecret();

log(`starting http://localhost:${port} (and http://127.0.0.1:${port})`);

const child = spawn(
  "npx",
  ["next", "dev", "--hostname", "0.0.0.0", "--port", port],
  { cwd: root, stdio: "inherit", env: process.env },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
