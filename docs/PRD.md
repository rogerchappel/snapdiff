# SnapDiff PRD

Status: in-progress

## Summary

SnapDiff is a local-first TypeScript CLI for deterministic output snapshot testing. It captures, diffs, and verifies deterministic outputs (text, JSON, Markdown, CLI stdout) as lightweight snapshots. Built for developer and agentic workflows that need fast, offline, readable regression guards without heavy test frameworks.

## Motivation

Developers writing CLIs, code generators, formatters, LLM wrappers, and pipeline tools constantly face the same problem: "did this change accidentally alter my output?" Traditional snapshot testing is tied to Jest/Vitest and requires full test harnesses. SnapDiff offers a zero-framework CLI approach: snapshot any file or command output, then verify later with human-readable diffs.

## Target users

- CLI tool authors verifying output stability across changes
- Agentic workflow engineers testing prompt→output pipelines
- OSS maintainers adding lightweight regression checking
- Developers integrating with CI via exit codes

## Goals

- Capture deterministic outputs from files or command stdout
- Store snapshots under a configurable `snapshots/` directory
- Compare current output against stored snapshots with clear diffs
- Support multiple comparison modes: exact, normalized (whitespace-insensitive), and JSON-equivalent
- Exit non-zero on mismatch for CI integration
- Support `--update` to accept new baselines
- Work completely offline

## Non-goals

- No LLM calls in the V1 path
- No hosted dashboard or account system
- No integration with specific test frameworks (though easy to call from them)
- No binary/image diff support in V1

## V1 CLI

```bash
snapdiff capture --from cmd --cmd "mytool --input fixture.json" --name mytool-output
snapdiff verify --name mytool-output          # exits 0 or 1
snapdiff verify --all                         # verify all snapshots
snapdiff diff --name mytool-output            # show human-readable diff
snapdiff list                                 # list all stored snapshots
snapdiff update --name mytool-output          # accept new baseline
snapdiff prune                                # remove unused snapshot files
```

## Snapshot format

Each snapshot stores:
- `snapshots/<name>.snap` — the raw expected output
- `snapshots/<name>.meta.json` — metadata (capture timestamp, mode, command, hash)

Comparison modes:
- `exact` — byte-for-byte match
- `normalize` — strip trailing whitespace, normalize line endings
- `json-equiv` — parse as JSON and compare semantically (key order independent)

## Functional requirements

1. Capture from file or command stdout
2. Deterministic storage with metadata
3. Three comparison modes (exact, normalize, json-equiv)
4. `--update` flag to accept changed output
5. `--all` batch verify
6. `--list` with summary of snapshot age/count
7. Color-coded diff output; disable colors with `--no-color`
8. Exit codes: 0 = pass, 1 = mismatch, 2 = usage error
9. Include fixtures under `examples/` and tests under `tests/`
10. No telemetry, no external network calls

## Acceptance criteria

- `npm test`, `npm run check`, `npm run build`, and `npm run smoke` pass
- `bash scripts/validate.sh` passes
- At least one real CLI smoke uses checked-in fixtures
- README explains why SnapDiff exists, quick start, comparison modes, examples
- GitHub repository is public under `rogerchappel/snapdiff` with useful description and topics

## Source attribution

Created during the twice-daily OSS factory run on 2026-05-12. Inspired by Jest/Picasso snapshot testing patterns and the broader snapshot testing ecosystem, but reimagined as a standalone framework-agnostic CLI. No code copied from existing projects.
