#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const isWindows = process.platform === "win32";

function run(cmd, args, opts) {
  return spawnSync(cmd, args, { stdio: "inherit", shell: isWindows, ...opts });
}

function git(args) {
  return spawnSync("git", args, { encoding: "utf8", shell: isWindows });
}

const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim();

if (branch === "main" || branch === "master") {
  console.log(`🔒 Don't push to ${branch}.`);
  process.exit(1);
}

console.log("🧐 DX-FLOW: Running tests...");

function hasTestRunScript() {
  try {
    const pkg = JSON.parse(readFileSync("./package.json", "utf8"));
    return Boolean(pkg.scripts && pkg.scripts["test:run"]);
  } catch {
    return false;
  }
}

if (!hasTestRunScript()) process.exit(0);

const testResult = run("npm", ["run", "test:run"]);

if (branch === "develop") {
  if (testResult.status !== 0) {
    console.log("☠️ Tests failed. Push to develop aborted.");
    process.exit(1);
  }
} else if (testResult.status !== 0) {
  console.log(`⚠️ Tests failed, but allowing push on ${branch}.`);
}
