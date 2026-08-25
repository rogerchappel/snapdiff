# SnapDiff

> **Deterministic output snapshot testing, minus the framework tax.**

You write CLIs, code generators, formatters, LLM wrappers — things that spit text at the terminal. And every time you change a line, you ask yourself: *"Did I just break the output?"*

SnapDiff answers that question without dragging in Jest, Vitest, or fifteen transitive dependencies. It's a CLI. It lives in your terminal. It works offline. No accounts, no dashboards, no telemetry. Just you, your output, and a friendly diff.

## Why SnapDiff Exists

Traditional snapshot testing locks you into a test framework. Jest snapshot, Vitest snapshot — they're great if you're already in that ecosystem. But if you're building a CLI tool, a pipeline script, or an agentic workflow, you don't want to spin up a full test harness just to check whether `mytool --format fancy` still produces the same output.

SnapDiff is the standalone alternative. Capture output. Compare later. Exit non-zero on mismatch. CI-friendly. Human-readable. Zero framework overhead.

## Quick Start

SnapDiff supports Node.js 18 and newer.

`@rogerchappel/snapdiff` is not published to npm yet. Until the first release,
install a tarball built from a checkout:

```bash
git clone https://github.com/rogerchappel/snapdiff.git
cd snapdiff
npm ci
package_tarball="$(npm pack --silent)"
npm install -g "./$package_tarball"

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

After the first npm release, the registry installation command will be:

```bash
npm install -g @rogerchappel/snapdiff
```

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

Exit codes: `0` = pass, `1` = mismatch or a failed producer command during
`--all`, `2` = usage/input error or a failed producer command during a
single-snapshot operation. `verify --all` reports a command failure for that
snapshot and continues checking the rest. An incomplete snapshot pair or
malformed `.meta.json` is an input error: the command names the affected
snapshot and exits nonzero instead of reporting that no snapshots exist.

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

Command-backed `capture`, `diff`, `verify`, and `update` operations require the
recorded command to exit successfully. Output from a non-zero command is never
treated as a match or accepted as a baseline. In particular, failed `capture`
and `update` operations do not create or overwrite snapshot files, and their
diagnostics include the exit code and command stderr when available.

### `snapdiff prune`

Remove incomplete snapshot pairs: a `.snap` without matching `.meta.json`, or
a `.meta.json` without matching `.snap`. Complete pairs with malformed metadata
are retained for manual repair; `list` and `verify --all` report them by name.

```bash
snapdiff prune
```

## Snapshot Storage

Snapshots live in a `snapshots/` directory at your project root (or wherever `--base-dir` points). Each snapshot produces two files:

- `snapshots/<name>.snap` — The raw expected output
- `snapshots/<name>.meta.json` — Metadata: capture timestamp, comparison mode, source command/file, content hash

Relative `--file` paths and `--cmd` commands are replayed from the working
directory where the snapshot was captured. This execution directory is stored
in new snapshot metadata, so `verify`, `diff`, `update`, and `verify --all`
behave consistently when invoked from another directory with the same absolute
`--base-dir`. Older metadata without an execution directory keeps the legacy
behavior of resolving sources from the current working directory.

SnapDiff validates each pair before listing, verifying, or updating it. The
metadata name, mode, timestamp, source fields, size, and content hash must be
valid and must match the `.snap` content. A corruption error names the affected
snapshot and exits non-zero instead of accepting an edited baseline. Restore
both files from version control or intentionally re-capture the snapshot to
recover; do not hand-edit only one half of the pair.

The format is intentionally simple — no binary blobs, no opaque archives. You can read, edit, and version-control these files directly.

Snapshot names are identifiers, not paths. For example, `api-response.v2` is valid, while `../api-response`, `nested/api-response`, and absolute paths are rejected.

## CI Integration

SnapDiff exits with code `1` on mismatch, making it trivial to integrate into CI pipelines:

```yaml
# GitHub Actions example (after the first npm release)
- run: npm install -g @rogerchappel/snapdiff
- run: snapdiff verify --name tool-output
```

Commit `snapshots/tool-output.snap` and `snapshots/tool-output.meta.json` with your
code. CI then compares the command's current output with that checked-in baseline;
if verification fails, the job fails without replacing the expected output first.

`capture` and `update` are intentional baseline-authoring operations. Run them
locally when adding or accepting output, review the snapshot diff, and commit it:

```bash
snapdiff capture --from cmd --cmd "./build/mytool" --name tool-output
# After an intentional output change:
snapdiff update --from cmd --cmd "./build/mytool" --name tool-output
git diff -- snapshots/tool-output.snap snapshots/tool-output.meta.json
```

Without `--from`, `update` reruns the source stored in snapshot metadata. Supplying
`--from cmd --cmd ...` or `--from file --file ...` replaces that source and
persists the replacement in metadata for later `verify`, `diff`, and `update`
commands. Source options must be supplied as a complete, matching pair.

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
