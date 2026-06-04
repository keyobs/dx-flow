# Changelog

# 🗒️ [3.1.0] - 2026-06-03
### Changed

- Copy Husky hooks into consuming projects in both install modes.
- Ask before overwriting existing Husky hooks during setup; `--force` overwrites without prompts.
- Ask before overwriting existing Biome and Commitlint configs during setup.

### Added

- Publish package automatically to GitHub Packages when a version tag is pushed.

### Removed

- Remove duplicated ```dx-flow hook:*``` commands and ```scripts/hooks``` files.

# 🗒️ [3.0.0] - 2026-05-18
### Added
- Install mode choice: copy scripts or install dx-flow as a project dependency.
- CLI commands: ```dx-flow qa:new```, ```dx-flow qa:validate```, ```dx-flow qa:reset```.
- CLI release commands: ```dx-flow release patch```, ```dx-flow release minor```, ```dx-flow release major```.
- Cross-platform commit command: ```dx-flow commit --skip-tests```.
- Package manager support for npm, pnpm, yarn, and bun.

### Changed
- CLI compatibility for Linux, Windows, and macOS.
- QA and release scripts inside dx-flow in dependency mode.
- Replace Unix-only skip-test alias with cross-platform CLI command.


# 🗒️ [2.0.0] - 2026-01-30
### Changed
- Convert project to node module
- Windows compatibility

<br>

# 🗒️ [1.0.0] - 2026-01-09
First version of CLI for TS projects : install and config DX quality tools.
Frameworks supported: config for React, React-Native, and Angular.

### Added
- CLI: ```dx-flow run``` command with --force flag support.
- Core Tools: Auto-install for **BiomeJS**, **Husky**, **Commitlint**, and **lint-staged**.

### Auto-Config:
- biome.json with dynamic schema versioning.
- commitlint.config.js with conventional standards.
- package.json scripts: lint, format, check, and prepare.

### Safety & Guardrails:
- Commit Guard:
  - Block direct pushes to main/master.
  - Auto lint staged files.
  - Checks types definition.
  - Secret Guard: Block .env file commits.
- Push Guard:
  - Block direct pushes to main/master.
  - Automated running test at push 
  - Enforced tests success on develop.
- Commit Guard:
  - Conventional Commit enforcement.

### Technical Details
- Engine: minimum Node.js ```22.21.1```
