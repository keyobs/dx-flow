# Changelog

# 🗒️ [2.1.0] - 2026-02-13
### Added
- commitlint : new keywords : clean
- Update doc

# 🗒️ [2.0.1] - 2026-01-30
### Fixes
- fixes to launch project on windows

# 🗒️ [2.0.0] - 2026-01-30
### Changed
- Convert project to node module

# 🗒️ [1.3.0] - 2026-01-29
### Added
- commitlint : new keywords : core, config, merge

# 🗒️ [1.2.0] - 2026-01-28
### Added
- husky hack : commit Alias to allow skiping pre-commit tests at commit.
- commitlint : now accepts uppercases

# 🗒️ [1.1.0] - 2026-01-22
### Added
- typescript config
- release commands to automate version incrementation 

### Changed
- biomejs angular template ignore .html files
- husky: handle only staged files

<br>

# 🗒️ [1.0.1] - 2026-01-09
- Initial release.
- npm publish workflow (dist package.json).

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