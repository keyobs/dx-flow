import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const bumpType = process.argv[2];
if (!bumpType || !["minor", "major"].includes(bumpType)) {
  console.error("Usage: node scripts/version-bump.mjs <minor|major>");
  process.exit(1);
}

const pkgPath = path.join(process.cwd(), "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const match = /^(\d+)\.(\d+)\.(\d+)/.exec(pkg.version);
if (!match) {
  console.error(`Unsupported version format: ${pkg.version}`);
  process.exit(1);
}

const major = Number(match[1]);
const minor = Number(match[2]);

const nextVersion =
  bumpType === "minor" ? `${major}.${minor + 1}.0` : `${major + 1}.0.0`;

execFileSync("npm", ["version", nextVersion, "-m", "chore(release): %s"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
