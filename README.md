# SnapDiff

> **Deterministic output snapshot testing, minus the framework tax.**

You write CLIs, code generators, formatters, LLM wrappers — things that spit text at the terminal. And every time you change a line, you ask yourself: *"Did I just break the output?"*

SnapDiff answers that question without dragging in Jest, Vitest, or fifteen transitive dependencies. It's a CLI. It lives in your terminal. It works offline. No accounts, no dashboards, no telemetry. Just you, your output, and a friendly diff.

## Why SnapDiff Exists

Traditional snapshot testing locks you into a test framework. Jest snapshot, Vitest snapshot — they're great if you're already in that ecosystem. But if you're building a CLI tool, a pipeline script, or an agentic workflow, you don't want to spin up a full test harness just to check whether `mytool --format fancy` still produces the same output.

SnapDiff is the standalone alternative. Capture output. Compare later. Exit non-zero on mismatch. CI-friendly. Human-readable. Zero framework overhead.

## Quick Start

```bash
# Install
npm install -g @rogerchappel/snapdiff

# Capture a snapshot from command output
snapdiff capture --from cmd --cmd "mytool --input fixture.json" --name mytool-output

# Verify against the stored snapshot (exits 0 on match, 1 on mismatch)
snapdiff verify --name mytool-output

# See a human-readable diff
snapdiff diff --name mytool-output

# Update the baseline when you intentionally change output
snapdiff update --name mytool-output

# List all snapshots
snapdiff list

# Remove orphaned snapshot files
snapdiff prune
```

The npm package is `@rogerchappel/snapdiff`; the installed command remains
`snapdiff`. The unscoped `snapdiff` package on npm is an unrelated project, so
existing install scripts should migrate to the scoped package name.

## Comparison Modes

SnapDiff supports three modes for comparing output:

| Mode | Behavior |
|------|----------|
| `exact` | Byte-for-byte match. Every character matters. |
| `normalize` | Strips trailing whitespace, normalizes line endings. Content must match, whitespace differences are ignored. |
| `json-equiv` | Parses both sides as JSON and compares semantically. Key order doesn't matter. Whitespace in JSON doesn't matter. |

```bash
snapdiff capture --from file --file output.json --name api-response --mode json-equiv
snapdiff verify --name api-response
```

## CLI Reference

### `snapdiff capture`

Capture output from a command or file.

```bash
snapdiff capture --from cmd --cmd "echo hello" --name greeting
snapdiff capture --from file --file path/to/file.txt --name file-snap --mode normalize
```

Options:
- `--name` — Snapshot identifier (required). Names must start with a letter or number and may contain only letters, numbers, dots, underscores, and hyphens; paths and traversal components are rejected.
- `--from` — Source type: `cmd` or `file` (required)
- `--cmd` — Command to execute (with `--from cmd`)
- `--file` — File path to read (with `--from file`)
- `--mode` — Comparison mode: `exact`, `normalize`, `json-equiv` (default: `exact`)

### `snapdiff verify`

Verify current output against stored snapshot(s).

```bash
snapdiff verify --name mytool-output
snapdiff verify --all
```

Options:
- `--name` — Snapshot to verify
- `--all` — Verify all snapshots
- `--no-color` — Disable colored output

Exit codes: `0` = pass, `1` = mismatch, `2` = usage error

### `snapdiff diff`

Show a human-readable diff between stored and current output.

```bash
snapdiff diff --name mytool-output
```

### `snapdiff list`

List all stored snapshots with metadata.

```bash
snapdiff list
```

### `snapdiff update`

Accept current output as the new baseline.

```bash
snapdiff update --name mytool-output
```

### `snapdiff prune`

Remove orphaned snapshot files (`.snap` files without matching `.meta.json`).

```bash
snapdiff prune
```

## Snapshot Storage

Snapshots live in a `snapshots/` directory at your project root (or wherever `--base-dir` points). Each snapshot produces two files:

- `snapshots/<name>.snap` — The raw expected output
- `snapshots/<name>.meta.json` — Metadata: capture timestamp, comparison mode, source command/file, content hash

The format is intentionally simple — no binary blobs, no opaque archives. You can read, edit, and version-control these files directly.

Snapshot names are identifiers, not paths. For example, `api-response.v2` is valid, while `../api-response`, `nested/api-response`, and absolute paths are rejected.

## CI Integration

SnapDiff exits with code `1` on mismatch, making it trivial to integrate into CI pipelines:

```yaml
# GitHub Actions example
- run: npm install -g @rogerchappel/snapdiff
- run: snapdiff capture --from cmd --cmd "./build/mytool" --name tool-output
- run: snapdiff verify --name tool-output
```

If verification fails, your CI job fails. Simple.

## Examples

The `examples/` directory contains sample fixtures:

- `examples/fixture.txt` — Plain text fixture
- `examples/fixture.json` — JSON fixture (great for `json-equiv` mode)
- `examples/fixture.md` — Markdown fixture

Run the smoke tests to see everything in action:

```bash
npm run smoke
```

## Development

```bash
npm install     # Install dependencies
npm run build   # Compile TypeScript
npm test        # Run test suite
npm run check   # Lint
npm run smoke   # Run CLI smoke tests
```

## License

MIT. Do what you want.

## Security

SnapDiff stores snapshots on disk as plain text or JSON files. It does not:

- Transmit data over the network
- Phone home or collect telemetry
- Execute arbitrary commands from snapshot files

Snapshots are plain files you own. Store them in your repo or scratch space; they contain exactly what your CLI output.

## Limitations

- Snapshots are stored as flat files — no compression or deduplication
- JSON snapshots preserve key order but not formatting differences (whitespace, indentation)
- Binary output is not supported — text and JSON only
- Large outputs (>10 MB) may slow diff comparison
- No support for regex-based ignore rules in snapshot matching (exact string comparison only)
- Works best with deterministic output; tools that emit timestamps or random IDs will cause snapshot mismatches unless the output is pre-processed
