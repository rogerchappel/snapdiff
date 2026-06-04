# SnapDiff — social hook pack (draft)

## X / Twitter (280 chars max)

### Hook 1 — The framework tax
```
Installing Jest just to check if your CLI output changed?

snapdiff does it standalone:

snapdiff capture --from cmd --cmd "mytool" --name output
snapdiff verify --name output
snapdiff diff --name output  # readable diff on mismatch

One global install. Zero framework tax.
https://github.com/rogerchappel/snapdiff
```

### Hook 2 — JSON snapshots
```
Testing JSON output where key order shouldn't matter?

SnapDiff has json-equiv mode:

snapdiff capture --from file --file api.json --mode json-equiv --name api

Same JSON, different formatting? ✅ Match.
Different data? ❌ Mismatch with readable diff.

https://github.com/rogerchappel/snapdiff
```

### Hook 3 — The CI gate
```
CI that catches CLI output drift:

- snapdiff capture --from cmd --cmd "./build/mytool" --name output
- snapdiff verify --name output

Exits 1 on mismatch. 0 on match.

Works in GitHub Actions, GitLab CI, or your own runner.

https://github.com/rogerchappel/snapdiff
```

## LinkedIn
```
Snapshot testing shouldn't require a test framework. If you're building a CLI, a code generator, or any tool that produces text output, you want to know when the output changes — but Jest and Vitest come with dozens of dependencies and configuration overhead.

SnapDiff is a standalone CLI for deterministic output snapshot testing. Capture output from a command or file, save it as a plain-text snapshot with metadata, and verify later. Three comparison modes: exact byte match, whitespace-normalized, and JSON-equivalent (key order doesn't matter).

Snapshots are two plain files: the raw output and a JSON metadata file. You can read them, edit them, commit them, diff them. No binary blobs.

npm install -g snapdiff

https://github.com/rogerchappel/snapdiff
```

## Reddit / Hacker News title ideas
- "A standalone CLI for snapshot testing — no Jest, no Vitest, no framework tax"
- "SnapDiff: deterministic output diff tool for CLIs and code generators"
- "I wanted snapshot testing without a test framework, so I built one"
