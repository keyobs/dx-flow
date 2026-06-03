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

const changes = getWorkingTreeChanges();
if (changes) {
  console.error("Cannot bump version: Git working directory is not clean.");
  console.error("");
  console.error(changes);
  console.error("");
  console.error("Commit or stash these changes before running the release command.");
  process.exit(1);
}

try {
  execFileSync("npm", ["version", nextVersion, "-m", "chore(release): %s"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
} catch {
  console.error(`Failed to bump version to ${nextVersion}.`);
  process.exit(1);
}

function getWorkingTreeChanges() {
  try {
    return execFileSync("git", ["status", "--short"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      shell: process.platform === "win32",
    }).trim();
  } catch {
    console.error("Cannot bump version: unable to read Git status.");
    process.exit(1);
  }
}
