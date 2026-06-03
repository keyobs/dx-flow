#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(rootDir, "package.json"), "utf8"));

const officialPackageName = "@keyobs/dx-flow";
const officialRemotes = new Set([
  "git@github.com:keyobs/dx-flow.git",
  "git+ssh://git@github.com/keyobs/dx-flow.git",
  "https://github.com/keyobs/dx-flow",
  "https://github.com/keyobs/dx-flow.git",
]);

if (pkg.name !== officialPackageName) {
  fail(`Package name must be ${officialPackageName} to publish the official package.`);
}

if (pkg.publishConfig?.registry !== "https://npm.pkg.github.com") {
  fail("publishConfig.registry must be https://npm.pkg.github.com.");
}

const originUrl = readGitConfig(["config", "--get", "remote.origin.url"]);
if (!officialRemotes.has(originUrl)) {
  fail(`remote.origin.url must point to keyobs/dx-flow before publishing. Current: ${originUrl || "missing"}`);
}

console.log("Official package publish checks passed.");

function readGitConfig(args) {
  try {
    return execFileSync("git", args, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function fail(message) {
  console.error(`Publish blocked: ${message}`);
  process.exit(1);
}
