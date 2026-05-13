# DX-FLOW
*DX for Developper Experience*

DX Flow CLI automates the installation and configuration of a bunch of tools on a project.

Official package: `@keyobs/dx-flow`

This repository is public and can be forked freely. Only Keyobs publishes the official package under the `@keyobs` scope. Forks should publish under their own GitHub Packages scope.

<br>

## TS CODE QUALITY TOOLS
- BiomeJS: Linter and formatter.
- Husky: Git hooks manager, automates script execution on commit/push.
- CommitLint: Commit message guard (enforces conventional standards).


<br>

## Quick setup

dx-flow can be executed via `npx` from GitHub Packages (no dependency is added to the app).

**Run dx-flow in a consuming app**

```
npx @keyobs/dx-flow@latest run
```

**Update dx-flow to the latest version (global) and run**

```
# Update the package version
npm i -g @keyobs/dx-flow@latest

# Overwrite a pre-existing config:
npx @keyobs/dx-flow run --force
```

<br>

## Features

- **Dependencies**: Installs Biome, Husky, Commitlint, and lint-staged.
- **Configs**: Deploys `biome.json` and `commitlint.config.js`.
- **Git Hooks**: Configures Husky hooks for validation.
- **Scripts**: Adds `lint`, `format`, `check`, and `prepare` to `package.json`.

<br>

## Safety Standards

- **Main Branch**: Blocks direct commits and pushes to `main`.
- **Secrets**: Blocks commits containing `.env` files.
- **Types**: Runs `tsc --noEmit` before committing.
- **Tests**: Enforces `npm run test:run` before pushing to `develop`.
- **Commits**: Validates conventional commit formats.

<br>

## Shortcuts

- **Skip tests on commit**: `git commit-skip-tests -m "..."`  
skips pre-commit tests only (lint and typecheck still run).

<br>

## Project Structure

```
.
├── bin/
│   └── dx-flow.sh                    # CLI entry point and path resolver
|       dx-flow.mjs
├── scripts/
│   ├── qa                            # QA scripts
│   ├── dx-flow-setup.mjs             # Main controller and framework selector
│   └── ts/
│       ├── setup-ts.mjs              # Technical setup script for TypeScript
│       └── templates/                # Tool configuration templates
│           ├── *framework*           # specific config for a framework
│           ├── commitlint.config.js  # Commit validation rules
│           └── .husky/               # Git hook templates
│               ├── pre-commit        # Branch protection and linting
│               ├── pre-push          # Test validation
│               └── commit-msg        # Commit message enforcement
```

<br>

## Versioning

DX-FLOW uses [SemVer](https://semver.org/) logic.  
These commands **bump the version, tag, and <u>commit</u> locally.**  

| Command | Target | Result |
| :--- | :--- | :--- |
| `npm run release:patch` | Bug fixes | `1.0.0` → `1.0.1` |
| `npm run release:minor` | New features | `1.0.0` → `1.1.0` |
| `npm run release:major` | Breaking changes | `1.0.0` → `2.0.0` |

**Windows note**

If you run `npm version` manually on Windows (PowerShell/cmd), use **double quotes** for the message:
```
npm version patch -m "chore(release): %s"
```

**Release candidate**

| Command | use | Result |
| :--- | :--- | :--- |
| `npm run qa:new` | Add -x then autoincrement | `1.0.0` → `1.0.0-0` |
| `npm run qa:validate` | Delete -x  | `1.0.0-3` → `1.0.0` |
| `npm run qa:reset` | Delete -x  | `1.0.0-3` → `1.0.0` |

`qa:validate` and `qa:reset` run the same command; both names stay for dev convenience.

<br>

## GitHub Packages Setup

DX-FLOW is published as the official private package `@keyobs/dx-flow` on GitHub Packages.

Configure npm to use GitHub Packages for the `@keyobs` scope:

```
@keyobs:registry=https://npm.pkg.github.com
```

Authenticate with a GitHub personal access token that has package permissions:

```
npm login --scope=@keyobs --auth-type=legacy --registry=https://npm.pkg.github.com
```

For personal machines, you can also keep the token in your user-level npm config:

```
//npm.pkg.github.com/:_authToken=TOKEN
```

## Publishing

The repository can be public, but the official package distribution is controlled by the `@keyobs` scope on GitHub Packages.

Publish the official package:

```
npm run publish:github
```

The `prepublishOnly` check blocks accidental publication unless:
- package name is `@keyobs/dx-flow`
- registry is `https://npm.pkg.github.com`
- `origin` points to `keyobs/dx-flow`

Forks should change the package name and repository before publishing under their own scope.

<br>

## Local Development
️⚠

**1. In dx-flow root directory :**

⚠️⚠️  If a global `dx-flow` binary already exists, remove it before linking:

```
npm unlink -g @keyobs/dx-flow
# or remove the binary directly:
# rm -f "$(npm bin -g)/dx-flow"
#
# PowerShell:
# Remove-Item -Force "$(npm bin -g)\\dx-flow.cmd"
#
# PowerShell (Cmd shim + global node_modules):
# Remove-Item -Recurse -Force "$(npm root -g)\\@keyobs\\dx-flow" 2>$null
```

Create a symlink :
```
# run at start
npm link
```

Create / Update the package :
```
# run at every change
npm pack
```

<br>

**2. In client app :**
```
dx-flow run
```
<br>

🪲 Debug

In local dev mode, if the install exits whith error, try refresh the node modules.

Clean node modules :
```
#PowerShell:
Remove-Item -Recurse -Force node_modules, package-lock.json
npm cache clean --force
```
```
#Linux/macos
rm -rf node_modules package-lock.json
npm cache clean --force
```
