import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

const cargoBin = path.join(os.homedir(), ".cargo", "bin");
const currentPath = process.env.PATH || process.env.Path || "";

const updatedPath = currentPath.toLowerCase().includes(".cargo\\bin")
  ? currentPath
  : `${cargoBin}${path.delimiter}${currentPath}`;

const args = process.argv.slice(2);
const tauriBin = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tauri.cmd" : "tauri"
);

const child = spawn(tauriBin, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    PATH: updatedPath,
    Path: updatedPath,
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
