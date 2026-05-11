# SnapDiff Fixture

A Markdown fixture for testing snapshot comparisons.

## Features

- **Exact mode**: byte-for-byte comparison
- **Normalize mode**: whitespace-insensitive
- **JSON-equiv mode**: semantic JSON comparison

## Usage

```bash
snapdiff capture --from file --file examples/fixture.md --name fixture-md
snapdiff verify --name fixture-md
```

