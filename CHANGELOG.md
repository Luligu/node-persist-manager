<!-- eslint-disable markdown/no-missing-label-refs -->

# NodeStorageManager and NodeStorage Changelog

All notable changes to this project will be documented in this file.

If you like this project and find it useful, please consider giving it a star on [GitHub](https://github.com/Luligu/node-persist-manager) and sponsoring it.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="120"></a>

## [2.1.0] - Dev branch

### Breaking changes

- [healthCheck]: Change static NodeStorage.healthCheck() to healthCheck().

### Added

- [NodeStorageManager]: Add keys(), values() and healthCheck() to NodeStorageManager.

### Changed

- [package]: Update dependencies.
- [package]: Bump package to `automator` v.3.1.7.
- [eslint]: Remove `eslint-plugin-promise` (not actively maintained) and add optional @typescript-eslint promise rules.
- [package]: Add `overrides` necessary for eslint-plugin-n.
- [package]: Bump `typescript` to v.6.0.3.
- [package]: Bump `eslint` to v.10.3.0.
- [package]: Bump `typescript-eslint` to v.8.59.2.
- [eslint]: Add `eslint` v.2.0.1 config.
- [prettier]: Add `prettier` v.2.0.0 config.
- [jest]: Add `jest` v.2.0.1 config.
- [package]: Add `.vscode\tasks.json`.
- [package]: Add `.vscode\settings.json`.
- [devcontainer]: Add `Claude Code for VS Code extension` to Dev Container.
- [agent]: Add `.github\copilot-instructions.md` for Copilot.
- [agent]: Add `.claude\CLAUDE.md` for Claude.
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

<!-- Commented out section
## [1.0.0] - 2025-07-01

### Added

- [Feature 1]: Description of the feature.
- [Feature 2]: Description of the feature.

### Changed

- [Feature 3]: Description of the change.
- [Feature 4]: Description of the change.

### Deprecated

- [Feature 5]: Description of the deprecation.

### Removed

- [Feature 6]: Description of the removal.

### Fixed

- [Bug 1]: Description of the bug fix.
- [Bug 2]: Description of the bug fix.

### Security

- [Security 1]: Description of the security improvement.

<a href="https://www.buymeacoffee.com/luligugithub">
  <img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="80">
</a>

-->
