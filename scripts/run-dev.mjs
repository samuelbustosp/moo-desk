import { spawn } from "node:child_process";
import path from "node:path";

const backendProc = spawn(
  process.execPath,
  ["--watch", "--no-warnings", path.join(process.cwd(), "backend", "server.mjs")],
  {
    stdio: "inherit",
    env: process.env,
  }
);

const nextBin = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "next.cmd" : "next"
);

const nextProc = spawn(nextBin, ["dev", "--port", "3000"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

function cleanup() {
  try {
    backendProc.kill();
  } catch {
    // ignore
  }
  try {
    nextProc.kill();
  } catch {
    // ignore
  }
}

process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});

nextProc.on("exit", (code) => {
  cleanup();
  process.exit(code ?? 0);
});
