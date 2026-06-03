# DX-FLOW
*DX for Developer Experience*

dx-flow is a Node CLI that bootstraps code quality, Git hooks, versioning, and release workflows for JS/TS projects.

Official package: `@keyobs/dx-flow`

This repository is public and can be forked freely. Only Keyobs publishes the official package under the `@keyobs` scope. Forks should publish under their own GitHub Packages scope.

<br>

## TS CODE QUALITY TOOLS
- BiomeJS: Linter and formatter.
- Husky: Git hooks manager, automates script execution on commit/push.
- CommitLint: Commit message guard (enforces conventional standards).


<br>

## Quick Setup

dx-flow can be executed via `npx` from GitHub Packages.

**Run dx-flow in a consuming app**

```
npx @keyobs/dx-flow@latest run
```

The setup asks for:
- the target framework
- the install mode

Install modes:
- `copy`: default mode; copies QA and release scripts into the consuming project.
- `dependency`: installs `@keyobs/dx-flow` as a dev dependency; QA and release scripts run through the `dx-flow` binary.

In both modes, Husky hooks are copied into the consuming project so they stay visible and editable.

Non-interactive examples:

```
npx @keyobs/dx-flow@latest run --mode copy
npx @keyobs/dx-flow@latest run --mode dependency
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
- **Modes**: Supports copied scripts or a managed `@keyobs/dx-flow` dependency.

Supported package managers:
- npm
- pnpm
- yarn
- bun

<br>

## Safety Standards

- **Main Branch**: Blocks direct commits and pushes to `main`.
- **Secrets**: Blocks commits containing `.env` files.
- **Types**: Runs `tsc --noEmit` before committing.
- **Tests**: Enforces `test:run` before pushing to `develop`.
- **Commits**: Validates conventional commit formats.

<br>

## Shortcuts

- **Skip tests on commit**: `dx-flow commit --skip-tests -m "..."`  
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

Direct CLI commands:

```
dx-flow release patch
dx-flow release minor
dx-flow release major
```

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

Direct CLI commands:

```
dx-flow qa:new
dx-flow qa:validate
dx-flow qa:reset
```

<br>

## GitHub Packages Setup

DX-FLOW is published as the official private package `@keyobs/dx-flow` on GitHub Packages.

Configure npm-compatible clients to use GitHub Packages for the `@keyobs` scope:

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

In `dependency` mode, dx-flow adds the registry line to the consuming project's `.npmrc` if it is missing. It never writes a token.

If installing `@keyobs/dx-flow` fails, dx-flow offers to continue in `copy` mode.


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

In local dev mode, if the install exits with error, try refresh the node modules.

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
