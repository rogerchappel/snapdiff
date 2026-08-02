#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

PACKAGE_NAME='@rogerchappel/snapdiff'
CLI_NAME='snapdiff'
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT

npm pack --json --pack-destination "$TEST_DIR" > "$TEST_DIR/pack.json"
TARBALL_NAME="$(node -e "const result = require(process.argv[1]); if (result.length !== 1) process.exit(1); process.stdout.write(result[0].filename)" "$TEST_DIR/pack.json")"
TARBALL_PATH="$TEST_DIR/$TARBALL_NAME"

PACKED_NAME="$(tar -xOf "$TARBALL_PATH" package/package.json | node -e "let data=''; process.stdin.on('data', chunk => data += chunk); process.stdin.on('end', () => process.stdout.write(JSON.parse(data).name))")"
if [ "$PACKED_NAME" != "$PACKAGE_NAME" ]; then
  echo "Expected packed package name $PACKAGE_NAME, got $PACKED_NAME" >&2
  exit 1
fi

npm install --prefix "$TEST_DIR/install" --ignore-scripts "$TARBALL_PATH" >/dev/null
INSTALLED_NAME="$(node -e "process.stdout.write(require(process.argv[1]).name)" "$TEST_DIR/install/node_modules/@rogerchappel/snapdiff/package.json")"
if [ "$INSTALLED_NAME" != "$PACKAGE_NAME" ]; then
  echo "Expected installed package name $PACKAGE_NAME, got $INSTALLED_NAME" >&2
  exit 1
fi

"$TEST_DIR/install/node_modules/.bin/$CLI_NAME" --help | grep -q 'snapdiff'
echo "Verified $PACKAGE_NAME from $TARBALL_NAME via the $CLI_NAME executable."
