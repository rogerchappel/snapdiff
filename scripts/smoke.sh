#!/usr/bin/env bash
set -euo pipefail

# Smoke test for snapdiff CLI
# Uses example fixtures to verify all commands work end-to-end

cd "$(dirname "${BASH_SOURCE[0]}")/.."

SNAPDIFF="node dist/index.js"
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT

PASS=0
FAIL=0

pass() {
  echo "PASS: $1"
  PASS=$((PASS + 1))
}

fail() {
  echo "FAIL: $1" >&2
  FAIL=$((FAIL + 1))
}

echo "=== snapdiff smoke tests ==="
echo ""

# Test 1: capture from file
echo "--- Test 1: capture from file ---"
if $SNAPDIFF capture --from file --file examples/fixture.txt --name fixture-text --base-dir "$TEST_DIR" 2>&1; then
  pass "capture from file"
else
  fail "capture from file"
fi

# Test 2: capture from file (JSON fixture)
echo ""
echo "--- Test 2: capture JSON fixture ---"
if $SNAPDIFF capture --from file --file examples/fixture.json --name fixture-json --mode json-equiv --base-dir "$TEST_DIR" 2>&1; then
  pass "capture JSON fixture"
else
  fail "capture JSON fixture"
fi

# Test 3: verify single snapshot (should pass - just captured)
echo ""
echo "--- Test 3: verify single snapshot ---"
if $SNAPDIFF verify --name fixture-text --base-dir "$TEST_DIR" 2>&1; then
  pass "verify single snapshot"
else
  fail "verify single snapshot"
fi

# Test 4: list snapshots
echo ""
echo "--- Test 4: list snapshots ---"
if $SNAPDIFF list --base-dir "$TEST_DIR" 2>&1 | grep -q "fixture-text"; then
  pass "list snapshots"
else
  fail "list snapshots"
fi

# Test 5: diff (should show no diff since just captured)
echo ""
echo "--- Test 5: diff (no changes) ---"
if $SNAPDIFF diff --name fixture-text --base-dir "$TEST_DIR" 2>&1 | grep -q "No differences"; then
  pass "diff shows no differences"
else
  fail "diff shows no differences"
fi

# Test 6: modify file and capture again, then verify should fail
echo ""
echo "--- Test 6: verify mismatch detection ---"
echo "modified content" > "$TEST_DIR/modified.txt"
$SNAPDIFF capture --from file --file "$TEST_DIR/modified.txt" --name modified-test --base-dir "$TEST_DIR" > /dev/null 2>&1
echo "different content" > "$TEST_DIR/modified.txt"
if $SNAPDIFF verify --name modified-test --base-dir "$TEST_DIR" 2>&1; then
  fail "verify should have detected mismatch"
else
  pass "verify detects mismatch (exit code 1)"
fi

# Test 7: update snapshot
echo ""
echo "--- Test 7: update snapshot ---"
if $SNAPDIFF update --name modified-test --base-dir "$TEST_DIR" 2>&1 | grep -q "updated"; then
  pass "update snapshot"
else
  fail "update snapshot"
fi

# Test 8: verify after update (should pass)
echo ""
echo "--- Test 8: verify after update ---"
if $SNAPDIFF verify --name modified-test --base-dir "$TEST_DIR" 2>&1; then
  pass "verify after update passes"
else
  fail "verify after update passes"
fi

# Test 9: capture with normalize mode
echo ""
echo "--- Test 9: capture with normalize mode ---"
if $SNAPDIFF capture --from file --file examples/fixture.md --name fixture-md --mode normalize --base-dir "$TEST_DIR" 2>&1; then
  pass "capture with normalize mode"
else
  fail "capture with normalize mode"
fi

# Test 10: verify --all
echo ""
echo "--- Test 10: verify all ---"
if $SNAPDIFF verify --all --base-dir "$TEST_DIR" 2>&1 | grep -q "passed"; then
  pass "verify --all"
else
  fail "verify --all"
fi

# Test 11: prune (no orphans yet)
echo ""
echo "--- Test 11: prune (no orphans) ---"
if $SNAPDIFF prune --base-dir "$TEST_DIR" 2>&1 | grep -qE "(No orphaned|pruned)"; then
  pass "prune with no orphans"
else
  fail "prune with no orphans"
fi

# Test 12: help output
echo ""
echo "--- Test 12: help ---"
if $SNAPDIFF --help 2>&1 | grep -q "snapdiff"; then
  pass "help output"
else
  fail "help output"
fi

# Test 13: --no-color flag
echo ""
echo "--- Test 13: --no-color ---"
if $SNAPDIFF list --base-dir "$TEST_DIR" --no-color 2>&1 | grep -q "fixture"; then
  pass "--no-color works"
else
  fail "--no-color works"
fi

# Test 14: unsafe names cannot escape the snapshots directory
echo ""
echo "--- Test 14: reject unsafe snapshot names ---"
printf 'sentinel\n' > "$TEST_DIR/escaped.snap"
unsafe_name='../escaped'
unsafe_commands=(capture verify diff update)
unsafe_rejected=true

for command in "${unsafe_commands[@]}"; do
  if [ "$command" = capture ]; then
    if $SNAPDIFF "$command" --name "$unsafe_name" --from file --file examples/fixture.txt --base-dir "$TEST_DIR" >/dev/null 2>&1; then
      unsafe_rejected=false
    fi
  elif $SNAPDIFF "$command" --name "$unsafe_name" --base-dir "$TEST_DIR" >/dev/null 2>&1; then
    unsafe_rejected=false
  fi
done

mkdir -p "$TEST_DIR/snapshots"
printf 'orphan\n' > "$TEST_DIR/snapshots/...snap"
$SNAPDIFF prune --base-dir "$TEST_DIR" >/dev/null 2>&1 || true

if [ "$unsafe_rejected" = true ] \
  && [ "$(cat "$TEST_DIR/escaped.snap")" = sentinel ] \
  && [ -f "$TEST_DIR/snapshots/...snap" ]; then
  pass "unsafe names cannot read, write, or delete outside snapshots"
else
  fail "unsafe snapshot name protection"
fi

echo ""
echo "=== Results ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "Smoke tests FAILED."
  exit 1
fi

echo "All smoke tests passed."
