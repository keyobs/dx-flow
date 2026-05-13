#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';
import readline from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '../package.json');
const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

const args = process.argv.slice(2);
let force = false;
let projectDir = '.';

for (const arg of args) {
  if (arg === '--force') force = true;
  else if (projectDir === '.') projectDir = arg;
}

console.log(`\n  🛡️  DX-FLOW v${pkg.version}`);
console.log('  ---------------------------');
console.log('  Checking systems...\n');

const targetPackageJson = resolve(process.cwd(), projectDir, 'package.json');
if (!existsSync(targetPackageJson)) {
  console.error(`❌ Missing package.json in ${projectDir}`);
  process.exit(1);
}

const framework = await promptFramework();
const setupTsPath = join(__dirname, 'ts/setup-ts.mjs');

if (!existsSync(setupTsPath)) {
  console.error('❌ Script not found in scripts/ts/');
  process.exit(1);
}

console.log(`Launch config for ${framework}...`);

const setupArgs = [];
if (force) setupArgs.push('--force');
setupArgs.push('--project', projectDir, '--framework', framework);

const child = spawn(process.execPath, [setupTsPath, ...setupArgs], { stdio: 'inherit' });
child.on('error', (err) => {
  console.error(err);
  process.exit(1);
});
child.on('close', (code) => process.exit(code));

function promptFramework() {
  return new Promise((resolve) => {
    const options = ['react', 'react-native', 'angular', 'typescript'];
    console.error('🔍 Choose framework');
    options.forEach((opt, i) => console.error(`${i + 1}) ${opt}`));

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = () => rl.question('#? ', (ans) => {
      const idx = parseInt(ans, 10) - 1;
      if (options[idx]) { rl.close(); resolve(options[idx]); }
      else { console.error('❌ Invalid choice'); ask(); }
    });
    ask();
  });
}
