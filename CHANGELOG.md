# Changelog

All notable changes to this project will be documented in this file.

This project follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
format and uses semantic versioning when versioned releases are published.

## [Unreleased]

### Added

- Initial project setup.
- Dependency vulnerability auditing in release validation.
- Packed-package validation for the published identity and installed CLI.

### Changed

- Publish as `@rogerchappel/snapdiff` while retaining `snapdiff` as the CLI
  command. The unscoped npm package belongs to an unrelated project.

### Security

- Reject snapshot names containing paths or traversal components before snapshot files are accessed.
- Update the test toolchain to patched dependency versions.

## Release Links

- Unreleased:
  `https://github.com/rogerchappel/users-roger-developer-my-opensource-snapdiff/compare/...HEAD`
- Latest release:
  `https://github.com/rogerchappel/users-roger-developer-my-opensource-snapdiff/releases/latest`

Replace placeholder links once the first release tag exists.
