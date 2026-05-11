# SnapDiff Orchestration Plan

## Build Strategy

SnapDiff is built as a TypeScript CLI tool using Node.js native ESM. The orchestration follows a linear, dependency-aware order:

1. **Foundation** — package.json, tsconfig.json, build tooling
2. **Core modules** — snapshot engine, comparison logic, diff formatting
3. **CLI layer** — argument parsing, command dispatch
4. **Commands** — each CLI subcommand implemented independently
5. **Tests** — unit tests covering core logic
6. **Fixtures** — example inputs for smoke tests
7. **Integration** — smoke script, README, docs
8. **Verification** — full test suite, lint, build, smoke, validate

## Orchestration Manifest

See `docs/orchestration.json` for the machine-readable task graph. Each node declares:

- `id`: unique task identifier
- `depends_on`: list of task IDs that must complete first
- `action`: the work to be done (file write, edit, create)
- `files`: files created or modified

## Commit Strategy

The build targets ~30-50 atomic commits, each representing a meaningful unit of work:

- Package scaffold and config (3-5 commits)
- Core modules (8-10 commits, one per module)
- CLI commands (6-8 commits, one per command)
- Tests (5-6 commits, grouped by module)
- Fixtures and examples (3-4 commits)
- Scripts and tooling (3-4 commits)
- Docs and README (3-4 commits)
- Polish, verification, final touches (3-5 commits)

## Verification Flow

```
npm install → npm test → npm run check → npm run build → npm run smoke → bash scripts/validate.sh
```

All must pass before pushing. Failure at any step blocks the pipeline.

## Rollback Policy

Since we work on `main` directly on a fresh scaffold, each commit is independently functional. If verification fails after a push, the previous commit serves as the rollback point.
