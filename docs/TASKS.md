# SnapDiff Task List

This document tracks the build tasks for SnapDiff V1.

## Project Setup

- [x] Initialize package.json with proper metadata
- [x] Add TypeScript configuration (`tsconfig.json`)
- [x] Configure build tooling (tsc or esbuild)
- [x] Set up linting (eslint with TypeScript parser)

## Core Implementation

- [x] CLI argument parser (`src/cli/args.ts`)
- [x] Snapshot storage engine (`src/core/snapshot.ts`)
- [x] Comparison modes: exact, normalize, json-equiv (`src/core/compare.ts`)
- [x] Diff output formatter with color support (`src/core/diff.ts`)
- [x] Command handler: `capture` (`src/commands/capture.ts`)
- [x] Command handler: `verify` (`src/commands/verify.ts`)
- [x] Command handler: `diff` (`src/commands/diff.ts`)
- [x] Command handler: `list` (`src/commands/list.ts`)
- [x] Command handler: `update` (`src/commands/update.ts`)
- [x] Command handler: `prune` (`src/commands/prune.ts`)
- [x] CLI entry point wiring (`src/index.ts`)

## Testing

- [x] Unit tests for comparison modes (`tests/compare.test.ts`)
- [x] Unit tests for snapshot storage (`tests/snapshot.test.ts`)
- [x] Unit tests for CLI argument parsing (`tests/args.test.ts`)
- [x] Unit tests for diff formatting (`tests/diff.test.ts`)
- [x] Integration smoke via `scripts/smoke.sh`

## Fixtures & Examples

- [x] Example JSON fixture (`examples/fixture.json`)
- [x] Example text fixture (`examples/fixture.txt`)
- [x] Example Markdown fixture (`examples/fixture.md`)
- [x] Example CLI output fixture (`examples/cli-output.txt`)

## Scripts

- [x] Smoke test script (`scripts/smoke.sh`)
- [x] Validation script already present (`scripts/validate.sh`)

## Documentation

- [x] PRD written (`docs/PRD.md`)
- [x] Orchestration plan (`docs/ORCHESTRATION.md`)
- [x] Orchestration manifest (`docs/orchestration.json`)
- [x] README with personality and quick start

## Verification Checklist

- [ ] `npm install && npm test && npm run check && npm run build && npm run smoke`
- [ ] `bash scripts/validate.sh` passes
- [ ] At least one CLI smoke uses fixtures
- [ ] ~30-50 meaningful atomic commits
- [ ] Push to main on `rogerchappel/snapdiff`
