import { parseQaVersion, readPackageJson, writePackageJson } from "./qa-utils.mjs";

try {
  const pkg = readPackageJson();
  const { base, suffix } = parseQaVersion(pkg.version);
  const nextNum = suffix ? Number.parseInt(suffix, 10) + 1 : 0;

  pkg.version = `${base}-${nextNum}`;

  writePackageJson(pkg);
  console.log(`Updated version to ${pkg.version}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
