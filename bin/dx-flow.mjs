#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import process from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '../package.json');
const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

const args = process.argv.slice(2);
const command = args[0];

if (command === '--version' || command === '-v') {
  console.log(`dx-flow v${pkg.version}`);
  process.exit(0);
}

if (command === 'run') {
  runScript('../scripts/dx-flow-setup.mjs', args.slice(1), 'scripts/');
} else if (command === 'qa:new') {
  runScript('../scripts/qa/qa-new.mjs', args.slice(1), 'scripts/qa/');
} else if (command === 'qa:validate') {
  runScript('../scripts/qa/qa-release.mjs', ['validate', ...args.slice(1)], 'scripts/qa/');
} else if (command === 'qa:reset') {
  runScript('../scripts/qa/qa-release.mjs', ['reset', ...args.slice(1)], 'scripts/qa/');
} else if (command === 'release') {
  runRelease(args.slice(1));
} else if (command === 'commit') {
  runScript('../scripts/git/commit.mjs', args.slice(1), 'scripts/git/');
} else {
  console.log('Usage: dx-flow <command> [options]');
  console.log('\nCommands:');
  console.log('  run [--force] [dir]');
  console.log('  qa:new');
  console.log('  qa:validate');
  console.log('  qa:reset');
  console.log('  release <patch|minor|major>');
  console.log('  commit [--skip-tests] <git commit args>');
  console.log('\nOptions:');
  console.log('  --version, -v');
  process.exit(1);
}

function runRelease(releaseArgs) {
  const releaseType = releaseArgs[0];
  if (releaseType === 'patch') {
    runCommand('npm', ['version', 'patch', '-m', 'chore(release): %s']);
    return;
  }
  if (releaseType === 'minor' || releaseType === 'major') {
    runScript('../scripts/version-bump.mjs', releaseArgs, 'scripts/');
    return;
  }

  console.error('Usage: dx-flow release <patch|minor|major>');
  process.exit(1);
}

function runScript(relativePath, scriptArgs, errorDir) {
  const scriptPath = join(__dirname, relativePath);
  if (!existsSync(scriptPath)) {
    console.error(`❌ Script not found in ${errorDir}`);
    process.exit(1);
  }

  runCommand(process.execPath, [scriptPath, ...scriptArgs]);
}

function runCommand(commandName, commandArgs) {
  const child = spawn(commandName, commandArgs, { stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  child.on('close', (code) => process.exit(code));
}
