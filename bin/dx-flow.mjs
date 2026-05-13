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
  runSetup(args.slice(1));
} else {
  console.log('Usage: dx-flow <command> [options]');
  console.log('\nCommands:');
  console.log('  run [--force] [dir]');
  console.log('\nOptions:');
  console.log('  --version, -v');
  process.exit(1);
}

async function runSetup(runArgs) {
  const setupScriptPath = join(__dirname, '../scripts/dx-flow-setup.mjs');
  if (!existsSync(setupScriptPath)) {
    console.error('❌ Script not found in scripts/');
    process.exit(1);
  }

  const child = spawn(process.execPath, [setupScriptPath, ...runArgs], { stdio: 'inherit' });
  child.on('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  child.on('close', (code) => process.exit(code));
}
