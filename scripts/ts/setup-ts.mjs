#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { chmod, copyFile as copyFileFs, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import process from 'node:process';

const isWindows = process.platform === 'win32';
const args = process.argv.slice(2);
const { force, projectDir, framework } = parseArgs(args);

const resolvedProjectDir = resolve(process.cwd(), projectDir);
const projectPackageJson = join(resolvedProjectDir, 'package.json');
if (!existsSync(projectPackageJson)) {
  console.error(`❌ Missing package.json in ${projectDir}`);
  process.exit(1);
}

const tsDir = dirname(fileURLToPath(import.meta.url));
const templateDir = join(tsDir, 'templates');
const huskyTemplateDir = join(templateDir, '.husky');
const qaDir = join(tsDir, '../qa');

process.chdir(resolvedProjectDir);

await installDependencies();

await copyFrameworkConfig(framework);
await updateBiomeSchema();
await copyTemplateFile(join(templateDir, 'commitlint.config.mjs'), join(resolvedProjectDir, 'commitlint.config.mjs'));

console.log('Adding node commands...');
await updatePackageJson(resolvedProjectDir, force);

await mkdir(join(resolvedProjectDir, 'scripts'), { recursive: true });
await copyTemplateFile(join(tsDir, '../version-bump.mjs'), join(resolvedProjectDir, 'scripts/version-bump.mjs'));
await copyTemplateDir(qaDir, join(resolvedProjectDir, 'scripts/qa'), force);

await configureHusky(resolvedProjectDir, huskyTemplateDir, force);

console.log('✨ Setup completed successfully.');

function parseArgs(inputArgs) {
  let parsedForce = false;
  let parsedProjectDir = '.';
  let parsedFramework = '';

  const positional = [];
  for (let i = 0; i < inputArgs.length; i += 1) {
    const arg = inputArgs[i];
    if (arg === '--force') parsedForce = true;
    else if (arg === '--project') {
      parsedProjectDir = inputArgs[i + 1] || parsedProjectDir;
      i += 1;
    } else if (arg === '--framework') {
      parsedFramework = inputArgs[i + 1] || parsedFramework;
      i += 1;
    } else positional.push(arg);
  }

  if (positional.length > 0 && (positional[0] === '0' || positional[0] === '1')) {
    parsedForce = positional.shift() === '1';
  }
  if (positional.length > 0 && parsedProjectDir === '.') parsedProjectDir = positional.shift();
  if (positional.length > 0 && !parsedFramework) parsedFramework = positional.shift();

  return { force: parsedForce, projectDir: parsedProjectDir, framework: parsedFramework };
}

async function installDependencies() {
  console.log('📦 Installing dependencies...');
  await runCommand('npm', [
    'install',
    '-D',
    '@biomejs/biome@latest',
    '@commitlint/cli@latest',
    '@commitlint/config-conventional@latest',
    'husky@latest',
    'lint-staged@latest',
    '--no-audit',
    '--no-fund',
  ]);
}

async function copyFrameworkConfig(selectedFramework) {
  let biomeTemplate = 'react/biome.json';
  if (selectedFramework === 'angular') biomeTemplate = 'angular/biome.json';
  else if (selectedFramework === 'react-native') biomeTemplate = 'react-native/biome.json';
  else if (selectedFramework === 'typescript' || selectedFramework === 'ts' || !selectedFramework) {
    biomeTemplate = 'typescript/biome.json';
  }

  await copyTemplateFile(
    join(templateDir, biomeTemplate),
    join(resolvedProjectDir, 'biome.json')
  );
}

async function updateBiomeSchema() {
  const biomePath = join(resolvedProjectDir, 'biome.json');
  if (!existsSync(biomePath)) return;

  const biomeVersion = await getBiomeVersion();
  if (!biomeVersion) return;

  const content = await readFile(biomePath, 'utf8');
  const updated = content.replace(/\/schemas\/[^/"]+/g, `/schemas/${biomeVersion}`);
  if (updated !== content) {
    await writeFile(biomePath, updated);
  }
}

async function getBiomeVersion() {
  try {
    const { stdout } = await runCommandCapture('npm', ['list', '@biomejs/biome', '--depth=0', '--json']);
    if (!stdout) return '';
    const data = JSON.parse(stdout);
    return data?.dependencies?.['@biomejs/biome']?.version || '';
  } catch {
    return '';
  }
}

async function copyTemplateFile(src, dest) {
  if (existsSync(dest) && !force) {
    console.log(`⚠️  ${dest} already exists. Skipping...`);
    return;
  }
  if (!existsSync(src)) {
    console.log(`❌ Missing template: ${src}`);
    return;
  }
  await mkdir(dirname(dest), { recursive: true });
  await copyFileFs(src, dest);
  console.log(`✅ Installed: ${dest}`);
}

async function copyTemplateDir(src, dest, allowForce) {
  if (existsSync(dest) && !allowForce) {
    console.log(`⚠️  ${dest} already exists. Skipping...`);
    return;
  }
  if (!existsSync(src)) {
    console.log(`❌ Missing directory: ${src}`);
    return;
  }
  await mkdir(dirname(dest), { recursive: true });
  await rm(dest, { recursive: true, force: true });
  await cp(src, dest, { recursive: true });
  console.log(`✅ Installed: ${dest}`);
}

async function updatePackageJson(projectRoot, allowForce) {
  const pkgPath = join(projectRoot, 'package.json');
  if (!existsSync(pkgPath)) return;

  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  pkg.scripts = pkg.scripts || {};

  const updates = {
    prepare: 'husky',
    lint: 'biome check .',
    'lint:fix': 'biome check --write .',
    format: 'biome format --write .',
    check: 'tsc --noEmit',
    'release:patch': 'npm version patch -m "chore(release): %s"',
    'release:minor': 'node scripts/version-bump.mjs minor',
    'release:major': 'node scripts/version-bump.mjs major',
    'qa:new': 'node scripts/qa/qa-new.mjs',
    'qa:validate': 'node scripts/qa/qa-release.mjs validate',
    'qa:reset': 'node scripts/qa/qa-release.mjs reset',
  };

  for (const [key, val] of Object.entries(updates)) {
    if (!pkg.scripts[key] || allowForce) pkg.scripts[key] = val;
  }

  pkg['lint-staged'] = {
    '*.{js,jsx,ts,tsx,json}': ['biome check --write --no-errors-on-unmatched'],
  };

  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

async function configureHusky(projectRoot, huskyDir, allowForce) {
  if (!existsSync(join(projectRoot, '.git'))) return;

  console.log('Configuring Husky hooks...');
  await runCommand('npx', ['husky'], { cwd: projectRoot });

  await copyTemplateFile(join(huskyDir, 'commit-msg'), join(projectRoot, '.husky/commit-msg'));
  await copyTemplateFile(join(huskyDir, 'pre-commit'), join(projectRoot, '.husky/pre-commit'));
  await copyTemplateFile(join(huskyDir, 'pre-push'), join(projectRoot, '.husky/pre-push'));

  await safeChmod(join(projectRoot, '.husky/commit-msg'));
  await safeChmod(join(projectRoot, '.husky/pre-commit'));
  await safeChmod(join(projectRoot, '.husky/pre-push'));

  const aliasExists = await gitAliasExists(projectRoot);
  if (aliasExists && !allowForce) {
    console.log('⚠️  git alias commit-skip-tests already exists. Skipping...');
    return;
  }

  const aliasValue = '!f() { SKIP_TESTS=1 git commit "$@"; }; f';
  await runCommand('git', ['config', '--local', 'alias.commit-skip-tests', aliasValue], {
    cwd: projectRoot,
    shell: false,
  });
  console.log('✅ Installed git alias: commit-skip-tests');
}

async function gitAliasExists(projectRoot) {
  const result = await runCommandCapture('git', ['config', '--get', 'alias.commit-skip-tests'], {
    cwd: projectRoot,
    shell: false,
  });
  return result.code === 0;
}

async function safeChmod(filePath) {
  try {
    await chmod(filePath, 0o755);
  } catch {
    // Ignore chmod errors on unsupported platforms.
  }
}

function runCommand(command, argsList, options = {}) {
  const spawnOptions = {
    stdio: 'inherit',
    shell: options.shell ?? isWindows,
    cwd: options.cwd ?? resolvedProjectDir,
  };

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, argsList, spawnOptions);
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`${command} exited with code ${code}`));
    });
  });
}

function runCommandCapture(command, argsList, options = {}) {
  const spawnOptions = {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: options.shell ?? isWindows,
    cwd: options.cwd ?? resolvedProjectDir,
  };

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, argsList, spawnOptions);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      resolvePromise({ code, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}
