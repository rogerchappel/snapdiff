#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateRelease({ tag, manifest, artifactManifest, artifact }) {
  const errors = [];
  const expectedTag = `v${manifest.version}`;
  const expectedArtifact = `${manifest.name.replace(/^@/, '').replace('/', '-')}-${manifest.version}.tgz`;

  if (tag !== expectedTag) errors.push(`release tag ${tag} does not match package version ${expectedTag}`);
  if (artifactManifest.name !== manifest.name) {
    errors.push(`artifact package ${artifactManifest.name} does not match ${manifest.name}`);
  }
  if (artifactManifest.version !== manifest.version) {
    errors.push(`artifact version ${artifactManifest.version} does not match ${manifest.version}`);
  }
  if (basename(artifact) !== expectedArtifact) {
    errors.push(`artifact filename ${basename(artifact)} does not match ${expectedArtifact}`);
  }

  return errors;
}

function readArtifactManifest(artifact) {
  const result = spawnSync('tar', ['-xOf', artifact, 'package/package.json'], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`cannot read package/package.json from ${artifact}: ${result.stderr.trim()}`);
  }
  return JSON.parse(result.stdout);
}

function main() {
  const [tag, artifactArgument] = process.argv.slice(2);
  if (!tag || !artifactArgument) {
    console.error('usage: validate-release-artifact.mjs <vX.Y.Z tag> <package.tgz>');
    process.exit(2);
  }

  const root = new URL('../', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
  const artifact = resolve(artifactArgument);
  const errors = validateRelease({ tag, manifest, artifactManifest: readArtifactManifest(artifact), artifact });

  if (errors.length > 0) {
    for (const error of errors) console.error(`FAIL: ${error}`);
    process.exit(1);
  }
  console.log(`Validated ${basename(artifact)} for ${tag}.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
