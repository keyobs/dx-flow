#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import process from "node:process";

const isWindows = process.platform === "win32";
const inputArgs = process.argv.slice(2);
const skipTests = inputArgs.includes("--skip-tests");
const commitArgs = inputArgs.filter((arg) => arg !== "--skip-tests");

if (commitArgs.length === 0) {
  console.error("Usage: dx-flow commit [--skip-tests] <git commit args>");
  process.exit(1);
}

const previousSkipTests = readGitConfig("hooks.skiptests");

try {
  if (skipTests) {
    writeGitConfig("hooks.skiptests", "1");
  }

  const code = await runGitCommit(commitArgs);
  process.exitCode = code;
} finally {
  if (skipTests) {
    restoreSkipTests(previousSkipTests);
  }
}

function readGitConfig(key) {
  try {
    return execFileSync("git", ["config", "--local", "--get", key], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      shell: isWindows,
    }).trim();
  } catch {
    return "";
  }
}

function writeGitConfig(key, value) {
  execFileSync("git", ["config", "--local", key, value], {
    stdio: "inherit",
    shell: isWindows,
  });
}

function unsetGitConfig(key) {
  try {
    execFileSync("git", ["config", "--local", "--unset", key], {
      stdio: "ignore",
      shell: isWindows,
    });
  } catch {
    // Missing config is fine.
  }
}

function restoreSkipTests(previousValue) {
  if (previousValue) {
    writeGitConfig("hooks.skiptests", previousValue);
  } else {
    unsetGitConfig("hooks.skiptests");
  }
}

function runGitCommit(args) {
  return new Promise((resolve) => {
    const child = spawn("git", ["commit", ...args], {
      stdio: "inherit",
      shell: isWindows,
    });

    child.on("error", (error) => {
      console.error(error.message);
      resolve(1);
    });
    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}
