# NodeStorageManager and NodeStorage Changelog

[![npm version](https://img.shields.io/npm/v/node-persist-manager.svg)](https://www.npmjs.com/package/node-persist-manager)
[![npm downloads](https://img.shields.io/npm/dt/node-persist-manager.svg)](https://www.npmjs.com/package/node-persist-manager)
![Node.js CI](https://github.com/Luligu/node-persist-manager/actions/workflows/build.yml/badge.svg)
![CodeQL](https://github.com/Luligu/node-persist-manager/actions/workflows/codeql.yml/badge.svg)
[![codecov](https://codecov.io/gh/Luligu/node-persist-manager/branch/main/graph/badge.svg)](https://codecov.io/gh/Luligu/node-persist-manager)
[![tested with Vitest](https://img.shields.io/badge/tested_with-Vitest-6E9F18.svg?logo=vitest&logoColor=white)](https://vitest.dev)
[![styled with Oxc](https://img.shields.io/badge/styled_with-Oxc-9BE4E0.svg?logo=oxc&logoColor=white)](https://oxc.rs/docs/guide/usage/formatter.html)
[![linted with Oxc](https://img.shields.io/badge/linted_with-Oxc-9BE4E0.svg?logo=oxc&logoColor=white)](https://oxc.rs/docs/guide/usage/linter.html)
[![TypeScript Native](https://img.shields.io/badge/TypeScript_Native-3178C6?logo=typescript&logoColor=white)](https://github.com/microsoft/typescript-go)
[![ESM](https://img.shields.io/badge/ESM-Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

---

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

If you like this project and find it useful, please consider giving it a star on [GitHub](https://github.com/Luligu/node-persist-manager) and sponsoring it.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="120"></a>

## [2.1.2] - Dev branch

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80"></a>

## [2.1.1] - 2026-08-29

### Added

- [devcontainer]: Add Dev Container (Bun and Node) v.2.0.0.

### Changed

- [package]: Apply uniform style.
- [package]: Update dependencies.
- [package]: Upgrade package.
- [package]: Bump `oxfmt` to v.0.65.0.
- [package]: Bump `oxlint` to v.1.80.0.
- [package]: Bump `oxlint-tsgolint` to v.7.0.2001.
- [package]: Bump `@types/node` to v.26.4.0.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80"></a>

## [2.1.0] - 2026-06-20

### Breaking changes

- [healthCheck]: Change static NodeStorage.healthCheck() to healthCheck().

### Added

- [NodeStorageManager]: Add keys(), values() and healthCheck() to NodeStorageManager.
- [ManagedLocalStorage]: Add getDatum() with correct Promise return type and changed any with unknown.

### Changed

- [package]: Update dependencies.
- [package]: Bump package to `automator` v.3.1.12 and the [new toolchain](README.md#repository-setup).
- [package]: Bump `typescript` to v.6.0.3.
- [package]: Bump `.devcontainer/devcontainer.json` config to v.1.0.4.
- [package]: Bump `.vscode/settings.json` config to v.1.0.3.
- [package]: Bump `.vscode/extensions.json` config to v.1.0.4.
- [package]: Bump `.vscode/tasks.json` config to v.1.0.3.
- [workflows]: Bump `build.yml` workflow to v.2.0.5.
- [workflows]: Bump `codecov.yml` workflow to v.2.0.5.
- [workflows]: Bump `publish.yml` workflow to v.2.0.5.
- [workflows]: Bump `codeql.yml` workflow to v.2.0.0.
- [package]: Refactor `scripts`.
- [package]: Add package script `typecheck`.
- [package]: Add Node.js 26 to package `engines` field.
- [workflows]: Add Node.js 26 to `build.yml` Node matrix and remove Node.js 20.
- [devcontainer]: Add `Claude Code VS Code extension` to Dev Container.
- [devcontainer]: Add `Codex VS Code extension` to Dev Container.
- [devcontainer]: Add `Jest / Vitest Runner VS Code extension` to Dev Container.
- [devcontainer]: Add `Vitest VS Code extension` to Dev Container.
- [agent]: Add `.github\copilot-instructions.md` for Copilot.
- [agent]: Add `CLAUDE.md` for Claude.
- [codex]: Add `AGENTS.md` for Codex.
- [codex]: Add `.codex\config.toml` configuration for Codex.
- [codex]: Add `.codex\rules\default.rules` rules (sandbox) for Codex.
- [agent]: Add agent custom instructions (`testing`) for Copilot and Claude.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80"></a>

## [2.0.2] - 2026-04-10

### Changed

- [package]: Update dependencies.
- [package]: Update actions versions in workflows.
- [package]: Bump package to `automator` v.3.1.4.
- [package]: Bump `typescript` to v.6.0.2.
- [package]: Bump `typescript-eslint` to v.8.58.1.
- [package]: Bump `eslint` to v.10.2.0.
- [package]: Bump `prettier` to v.3.8.2.
- [package]: Add `type checking` script for Jest tests.
- [package]: Add `CODE_OF_CONDUCT.md`.
- [package]: Add `@eslint/json`.
- [package]: Add `@eslint/markdown`.
- [package]: Add `CONTRIBUTING.md`.
- [package]: Add `STYLEGUIDE.md`.
- [package]: Replace `eslint-plugin-import` with `eslint-plugin-simple-import-sort`.
- [devcontainer]: Update `Dev Container` configuration.
- [devcontainer]: Add `postStartCommand` to the Dev Container configuration.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80"></a>

## [2.0.1] - 2026-02-16

### Changed

- [package]: Update dependencies.
- [package]: Bump to Automator v. 3.0.7.
- [package]: Add cache under .cache.
- [workflow]: Migrate to trusted publishing / OIDC.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80"></a>

## [2.0.0] - 2025-06-22

- [init]: Release 2.0.0
