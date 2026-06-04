#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { chmod, copyFile as copyFileFs, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import process from 'node:process';
import readline from 'node:readline';

const isWindows = process.platform === 'win32';
const dxFlowPackageName = '@keyobs/dx-flow';
const dxFlowVersion = await readDxFlowVersion();
const args = process.argv.slice(2);
const { force, projectDir, framework, mode } = parseArgs(args);

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
const packageManager = detectPackageManager(resolvedProjectDir);

process.chdir(resolvedProjectDir);

let effectiveMode = mode;

await installDependencies(packageManager);

if (effectiveMode === 'dependency') {
  await ensureGitHubPackagesNpmrc(resolvedProjectDir);
  const installed = await installDxFlowDependency(packageManager);
  if (!installed) {
    effectiveMode = await promptCopyFallback();
    if (effectiveMode !== 'copy') {
      console.error('❌ Dependency mode cannot continue without @keyobs/dx-flow.');
      process.exit(1);
    }
  }
}

const biomeCopied = await copyFrameworkConfig(framework);
if (biomeCopied) await updateBiomeSchema();
await copyPromptedTemplate(
  join(templateDir, 'commitlint.config.mjs'),
  join(resolvedProjectDir, 'commitlint.config.mjs'),
  force
);

console.log('Adding node commands...');
await updatePackageJson(resolvedProjectDir, force, effectiveMode);

if (effectiveMode === 'copy') {
  await mkdir(join(resolvedProjectDir, 'scripts'), { recursive: true });
  await copyTemplateFile(join(tsDir, '../version-bump.mjs'), join(resolvedProjectDir, 'scripts/version-bump.mjs'));
  await copyTemplateDir(qaDir, join(resolvedProjectDir, 'scripts/qa'), force);
}

await configureHusky(resolvedProjectDir, huskyTemplateDir, force);

console.log('✨ Setup completed successfully.');

function parseArgs(inputArgs) {
  let parsedForce = false;
  let parsedProjectDir = '.';
  let parsedFramework = '';
  let parsedMode = 'copy';

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
    } else if (arg === '--mode') {
      parsedMode = inputArgs[i + 1] || parsedMode;
      i += 1;
    } else positional.push(arg);
  }

  if (positional.length > 0 && (positional[0] === '0' || positional[0] === '1')) {
    parsedForce = positional.shift() === '1';
  }
  if (positional.length > 0 && parsedProjectDir === '.') parsedProjectDir = positional.shift();
  if (positional.length > 0 && !parsedFramework) parsedFramework = positional.shift();

  if (parsedMode !== 'copy' && parsedMode !== 'dependency') {
    console.error('❌ Invalid install mode. Use copy or dependency.');
    process.exit(1);
  }

  return { force: parsedForce, projectDir: parsedProjectDir, framework: parsedFramework, mode: parsedMode };
}

async function installDependencies(pm) {
  console.log(`📦 Installing dependencies with ${pm}...`);
  await runInstall(pm, [
    '@biomejs/biome@latest',
    '@commitlint/cli@latest',
    '@commitlint/config-conventional@latest',
    'husky@latest',
    'lint-staged@latest',
  ]);
}

async function copyFrameworkConfig(selectedFramework) {
  let biomeTemplate = 'react/biome.json';
  if (selectedFramework === 'angular') biomeTemplate = 'angular/biome.json';
  else if (selectedFramework === 'react-native') biomeTemplate = 'react-native/biome.json';
  else if (selectedFramework === 'typescript' || selectedFramework === 'ts' || !selectedFramework) {
    biomeTemplate = 'typescript/biome.json';
  }

  return copyPromptedTemplate(
    join(templateDir, biomeTemplate),
    join(resolvedProjectDir, 'biome.json'),
    force
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
    const biomePackageJson = join(resolvedProjectDir, 'node_modules/@biomejs/biome/package.json');
    const data = JSON.parse(await readFile(biomePackageJson, 'utf8'));
    return data?.version || '';
  } catch {
    return '';
  }
}

async function copyTemplateFile(src, dest, allowOverwrite = force) {
  if (existsSync(dest) && !allowOverwrite) {
    console.log(`⚠️  ${dest} already exists. Skipping...`);
    return false;
  }
  if (!existsSync(src)) {
    console.log(`❌ Missing template: ${src}`);
    return false;
  }
  await mkdir(dirname(dest), { recursive: true });
  await copyFileFs(src, dest);
  console.log(`✅ Installed: ${dest}`);
  return true;
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

async function updatePackageJson(projectRoot, allowForce, installMode) {
  const pkgPath = join(projectRoot, 'package.json');
  if (!existsSync(pkgPath)) return;

  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  pkg.scripts = pkg.scripts || {};

  const baseUpdates = {
    prepare: 'husky',
    lint: 'biome check .',
    'lint:fix': 'biome check --write .',
    format: 'biome format --write .',
    check: 'tsc --noEmit',
  };

  const workflowUpdates = installMode === 'dependency' ? {
    'release:patch': 'dx-flow release patch',
    'release:minor': 'dx-flow release minor',
    'release:major': 'dx-flow release major',
    'qa:new': 'dx-flow qa:new',
    'qa:validate': 'dx-flow qa:validate',
    'qa:reset': 'dx-flow qa:reset',
  } : {
    'release:patch': 'npm version patch -m "chore(release): %s"',
    'release:minor': 'node scripts/version-bump.mjs minor',
    'release:major': 'node scripts/version-bump.mjs major',
    'qa:new': 'node scripts/qa/qa-new.mjs',
    'qa:validate': 'node scripts/qa/qa-release.mjs validate',
    'qa:reset': 'node scripts/qa/qa-release.mjs reset',
  };

  const updates = { ...baseUpdates, ...workflowUpdates };

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
  await runPackageExecutor(packageManager, 'husky', [], { cwd: projectRoot });

  await copyHookTemplate(join(huskyDir, 'commit-msg'), join(projectRoot, '.husky/commit-msg'), allowForce);
  await copyHookTemplate(join(huskyDir, 'pre-commit'), join(projectRoot, '.husky/pre-commit'), allowForce);
  await copyHookTemplate(join(huskyDir, 'pre-push'), join(projectRoot, '.husky/pre-push'), allowForce);

  await safeChmod(join(projectRoot, '.husky/commit-msg'));
  await safeChmod(join(projectRoot, '.husky/pre-commit'));
  await safeChmod(join(projectRoot, '.husky/pre-push'));
}

async function safeChmod(filePath) {
  try {
    await chmod(filePath, 0o755);
  } catch {
    // Ignore chmod errors on unsupported platforms.
  }
}

async function copyHookTemplate(src, dest, allowForce) {
  if (!existsSync(dest) || allowForce) {
    return copyTemplateFile(src, dest, true);
  }

  const shouldOverwrite = await promptOverwrite(dest);
  if (shouldOverwrite) {
    return copyTemplateFile(src, dest, true);
  }
  console.log(`⚠️  ${dest} already exists. Skipping...`);
  return false;
}

async function copyPromptedTemplate(src, dest, allowForce) {
  if (!existsSync(dest) || allowForce) {
    return copyTemplateFile(src, dest, true);
  }

  const shouldOverwrite = await promptOverwrite(dest);
  if (shouldOverwrite) {
    return copyTemplateFile(src, dest, true);
  }
  console.log(`⚠️  ${dest} already exists. Skipping...`);
  return false;
}

function promptOverwrite(filePath) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`Overwrite existing ${filePath}? [y/N] `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

function detectPackageManager(projectRoot) {
  if (existsSync(join(projectRoot, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(projectRoot, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(projectRoot, 'bun.lockb')) || existsSync(join(projectRoot, 'bun.lock'))) return 'bun';
  return 'npm';
}

async function runInstall(pm, packages) {
  if (pm === 'pnpm') return runCommand('pnpm', ['add', '-D', ...packages]);
  if (pm === 'yarn') return runCommand('yarn', ['add', '-D', ...packages]);
  if (pm === 'bun') return runCommand('bun', ['add', '-d', ...packages]);
  return runCommand('npm', ['install', '-D', ...packages, '--no-audit', '--no-fund']);
}

async function runPackageExecutor(pm, binaryName, binaryArgs, options = {}) {
  if (pm === 'pnpm') return runCommand('pnpm', ['exec', binaryName, ...binaryArgs], options);
  if (pm === 'yarn') return runCommand('yarn', [binaryName, ...binaryArgs], options);
  if (pm === 'bun') return runCommand('bunx', [binaryName, ...binaryArgs], options);
  return runCommand('npx', [binaryName, ...binaryArgs], options);
}

async function ensureGitHubPackagesNpmrc(projectRoot) {
  const npmrcPath = join(projectRoot, '.npmrc');
  const registryLine = '@keyobs:registry=https://npm.pkg.github.com';
  let content = '';
  if (existsSync(npmrcPath)) {
    content = await readFile(npmrcPath, 'utf8');
  }
  if (content.includes(registryLine)) return;

  const nextContent = content.trim()
    ? `${content.replace(/\s*$/, '\n')}${registryLine}\n`
    : `${registryLine}\n`;
  await writeFile(npmrcPath, nextContent);
  console.log('✅ Configured .npmrc for @keyobs GitHub Packages registry.');
}

async function installDxFlowDependency(pm) {
  try {
    await runInstall(pm, [`${dxFlowPackageName}@${dxFlowVersion}`]);
    return true;
  } catch {
    console.error(`❌ Could not install ${dxFlowPackageName}@${dxFlowVersion} from GitHub Packages.`);
    console.error('Make sure your package manager is authenticated with a GitHub token that has read:packages.');
    return false;
  }
}

async function readDxFlowVersion() {
  const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), '../../package.json');
  const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  return pkg.version;
}

function promptCopyFallback() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Continue in copy mode instead? [Y/n] ', (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'n' ? 'dependency' : 'copy');
    });
  });
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
