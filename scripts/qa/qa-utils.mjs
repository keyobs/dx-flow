import fs from "node:fs";
import path from "node:path";

const pkgPath = path.join(process.cwd(), "package.json");

export function readPackageJson() {
  const raw = fs.readFileSync(pkgPath, "utf8");
  return JSON.parse(raw);
}

export function writePackageJson(pkg) {
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

export function parseQaVersion(version) {
  const match = /^(\d+\.\d+\.\d+)(?:-(\d+))?$/.exec(version);
  if (!match) {
    throw new Error(`Unsupported version format: ${version}`);
  }

  return {
    base: match[1],
    suffix: match[2],
  };
}
