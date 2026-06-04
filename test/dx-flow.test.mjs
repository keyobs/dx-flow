import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";

const rootDir = resolve(import.meta.dirname, "..");

test("qa commands update the current project's package version", async () => {
  const tempDir = makeTempProject({ version: "1.2.3" });
  const previousCwd = process.cwd();
  const previousArgv = process.argv;
  try {
    process.chdir(tempDir);
    process.argv = ["node", "qa-new"];

    await importFresh("scripts/qa/qa-new.mjs");
    assert.equal(readPackage(tempDir).version, "1.2.3-0");

    await importFresh("scripts/qa/qa-new.mjs");
    assert.equal(readPackage(tempDir).version, "1.2.3-1");

    process.argv = ["node", "qa-release", "validate"];
    await importFresh("scripts/qa/qa-release.mjs");
    assert.equal(readPackage(tempDir).version, "1.2.3");

    process.argv = ["node", "qa-new"];
    await importFresh("scripts/qa/qa-new.mjs");
    process.argv = ["node", "qa-release", "reset"];
    await importFresh("scripts/qa/qa-release.mjs");
    assert.equal(readPackage(tempDir).version, "1.2.3-0");
  } finally {
    process.chdir(previousCwd);
    process.argv = previousArgv;
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("commit --skip-tests restores hooks.skiptests in a finally block", () => {
  const commitScript = readFileSync(join(rootDir, "scripts/git/commit.mjs"), "utf8");
  assert.match(commitScript, /try \{/);
  assert.match(commitScript, /finally \{/);
  assert.match(commitScript, /restoreSkipTests\(previousSkipTests\);/);
  assert.match(commitScript, /git", \["commit", \.\.\.args\]/);
});

test("dependency mode installs the current dx-flow version, not latest", () => {
  const setup = readFileSync(join(rootDir, "scripts/ts/setup-ts.mjs"), "utf8");
  assert.match(setup, /const dxFlowVersion = await readDxFlowVersion\(\);/);
  assert.match(setup, /\`\$\{dxFlowPackageName\}@\$\{dxFlowVersion\}\`/);
  assert.doesNotMatch(setup, /dxFlowPackageName\}@latest/);
});

test("husky hooks support npm, pnpm, yarn, and bun commands", () => {
  const preCommit = readFileSync(join(rootDir, "scripts/ts/templates/.husky/pre-commit"), "utf8");
  const prePush = readFileSync(join(rootDir, "scripts/ts/templates/.husky/pre-push"), "utf8");

  for (const content of [preCommit, prePush]) {
    assert.match(content, /pnpm-lock\.yaml/);
    assert.match(content, /yarn\.lock/);
    assert.match(content, /bun\.lock/);
  }

  assert.match(preCommit, /pnpm'.*\['exec', binary/s);
  assert.match(preCommit, /yarn'.*\[binary, \.\.\.args/s);
  assert.match(preCommit, /bunx'.*\[binary, \.\.\.args/s);
  assert.doesNotMatch(preCommit, /run\('npx', \['lint-staged'\]\)/);

  assert.match(prePush, /pnpm'.*\['run', scriptName/s);
  assert.match(prePush, /yarn'.*\[scriptName/s);
  assert.match(prePush, /bun'.*\['run', scriptName/s);
  assert.doesNotMatch(prePush, /run\('npm', \['run', 'test:run'\]\)/);
});

test("husky hook templates are shell scripts that run node", () => {
  for (const hookName of ["commit-msg", "pre-commit", "pre-push"]) {
    const content = readFileSync(join(rootDir, "scripts/ts/templates/.husky", hookName), "utf8");
    const [firstLine, secondLine] = content.split("\n");
    assert.equal(firstLine, "#!/usr/bin/env sh");
    assert.notEqual(secondLine, "'use strict';");
    assert.match(content, /node <<'DX_FLOW_HOOK'/);
    assert.match(content, /DX_FLOW_HOOK\s*$/);
  }
});

test("hook commands are backward-compatible aliases to templates", () => {
  const cli = readFileSync(join(rootDir, "bin/dx-flow.mjs"), "utf8");
  assert.match(cli, /hook:commit-msg/);
  assert.match(cli, /scripts\/ts\/templates\/\.husky\/commit-msg/);
  assert.match(cli, /hook:pre-commit/);
  assert.match(cli, /scripts\/ts\/templates\/\.husky\/pre-commit/);
  assert.match(cli, /hook:pre-push/);
  assert.match(cli, /scripts\/ts\/templates\/\.husky\/pre-push/);
  assert.match(cli, /runCommand\('sh', \[scriptPath, \.\.\.hookArgs\]\)/);
  assert.equal(existsSync(join(rootDir, "scripts/hooks")), false);
});

test("setup asks before overwriting existing husky hooks", () => {
  const setup = readFileSync(join(rootDir, "scripts/ts/setup-ts.mjs"), "utf8");
  assert.match(setup, /copyHookTemplate\(join\(huskyDir, 'commit-msg'\), join\(projectRoot, '\.husky\/commit-msg'\), allowForce\)/);
  assert.match(setup, /copyHookTemplate\(join\(huskyDir, 'pre-commit'\), join\(projectRoot, '\.husky\/pre-commit'\), allowForce\)/);
  assert.match(setup, /copyHookTemplate\(join\(huskyDir, 'pre-push'\), join\(projectRoot, '\.husky\/pre-push'\), allowForce\)/);
  assert.match(setup, /Overwrite existing \$\{filePath\}\? \[y\/N\]/);
});

test("setup asks before overwriting biome and commitlint configs", () => {
  const setup = readFileSync(join(rootDir, "scripts/ts/setup-ts.mjs"), "utf8");
  assert.match(setup, /copyPromptedTemplate\(\s*join\(templateDir, biomeTemplate\),\s*join\(resolvedProjectDir, 'biome\.json'\),\s*force\s*\)/s);
  assert.match(setup, /copyPromptedTemplate\(\s*join\(templateDir, 'commitlint\.config\.mjs'\),\s*join\(resolvedProjectDir, 'commitlint\.config\.mjs'\),\s*force\s*\)/s);
  assert.match(setup, /const biomeCopied = await copyFrameworkConfig\(framework\);/);
  assert.match(setup, /if \(biomeCopied\) await updateBiomeSchema\(\);/);
});

function makeTempProject(pkg = {}) {
  const tempDir = mkdtempSync(join(tmpdir(), "dx-flow-test-"));
  writeFileSync(
    join(tempDir, "package.json"),
    `${JSON.stringify({ name: "consumer", version: "1.0.0", ...pkg }, null, 2)}\n`
  );
  return tempDir;
}

function readPackage(projectDir) {
  return JSON.parse(readFileSync(join(projectDir, "package.json"), "utf8"));
}

async function importFresh(relativePath) {
  const url = pathToFileURL(join(rootDir, relativePath));
  url.search = `?t=${Date.now()}-${Math.random()}`;
  await import(url.href);
}
