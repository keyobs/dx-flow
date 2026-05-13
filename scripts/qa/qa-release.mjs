import { parseQaVersion, readPackageJson, writePackageJson } from "./qa-utils.mjs";

const action = process.argv[2];
if (action !== "validate" && action !== "reset") {
  console.error("Usage: node scripts/qa/qa-release.mjs <validate|reset>");
  process.exit(1);
}

try {
  const pkg = readPackageJson();
  const { base } = parseQaVersion(pkg.version);

  pkg.version = action === "reset" ? `${base}-0` : base;

  writePackageJson(pkg);
  console.log(`Updated version to ${pkg.version}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
