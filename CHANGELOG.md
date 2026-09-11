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
- Publish snapshot content and metadata as a recoverable pair so a failed
  capture or update preserves the previous valid baseline.
- Raised the supported Node runtime floor to 20 (`engines`, CI matrix):
  the advisory-fixed test runner requires Node >=20 and Node 18 is
  end-of-life. Dependabot now also tracks the npm ecosystem.

### Security

- Reject snapshot names containing paths or traversal components before snapshot files are accessed.
- Update the test toolchain to patched dependency versions.
- Update the `brace-expansion` override to 5.0.9 to address
  GHSA-rgw5-rvv9-x895 in the development toolchain.
- Update the locked `js-yaml` dependency to 4.3.1 to address
  GHSA-5p4m-2wfm-xmqj in the development toolchain.
- Update the locked `nanoid` dependency to 3.3.18 to address
  GHSA-2v37-7h3g-55p8 in the development toolchain.
- Update the locked `js-yaml` dependency to 4.3.2 to address
  GHSA-2883-xcg3-v3hh in the development toolchain.
- Update the test toolchain to `vitest` 4.1.11 to address
  GHSA-82fw-gwwq-j7x9 in `@vitest/mocker`.

## Release Links

- Unreleased:
  `https://github.com/rogerchappel/users-roger-developer-my-opensource-snapdiff/compare/...HEAD`
- Latest release:
  `https://github.com/rogerchappel/users-roger-developer-my-opensource-snapdiff/releases/latest`

Replace placeholder links once the first release tag exists.
