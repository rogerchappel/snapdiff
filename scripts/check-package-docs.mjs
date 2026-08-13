#!/usr/bin/env node

import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = new URL('../', import.meta.url);
const packageJson = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
const expectedPackage = '@rogerchappel/snapdiff';
const errors = [];

if (packageJson.name !== expectedPackage) {
  errors.push(`package.json name must be ${expectedPackage}, found ${packageJson.name}`);
}

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return extname(entry.name) === '.md' ? [path] : [];
  });
}

const files = [new URL('README.md', root).pathname, ...markdownFiles(new URL('docs', root).pathname)];
const unscopedInstall = /\bnpm\s+install(?:\s+--global|\s+-g)?\s+snapdiff(?:\s|`|$)/g;

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const match of content.matchAll(unscopedInstall)) {
    const line = content.slice(0, match.index).split('\n').length;
    errors.push(`${relative(new URL('.', root).pathname, file)}:${line} installs the unrelated unscoped package`);
  }
}

const readme = readFileSync(new URL('README.md', root), 'utf8');
const requiredGuidance = [
  ['the package is explicitly described as unpublished', /not published to npm yet/i],
  ['the checkout path uses npm ci', /\bnpm ci\b/],
  ['the checkout path creates a tarball with npm pack', /\bnpm pack\b/],
  ['the checkout path installs the packed tarball', /npm install -g ["']\.\/\$package_tarball["']/],
  ['the registry command is labelled as post-release', /after the first npm release[\s\S]{0,200}npm install -g @rogerchappel\/snapdiff/i],
  ['CI verifies a checked-in baseline', /CI then compares[\s\S]{0,160}checked-in baseline/i],
  ['capture and update are described as baseline-authoring operations', /`capture` and `update` are intentional baseline-authoring operations/i],
];

for (const [description, pattern] of requiredGuidance) {
  if (!pattern.test(readme)) errors.push(`README.md: missing guidance: ${description}`);
}

const ciSection = readme.match(/^## CI Integration\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1] ?? '';
const ciExample = ciSection.match(/```ya?ml\s*([\s\S]*?)```/i)?.[1] ?? '';
const verification = /snapdiff\s+verify\b[^\n]*--name(?:=|\s+)([\w.-]+)/g;

for (const match of ciExample.matchAll(verification)) {
  const baseline = match[1];
  const precedingSteps = ciExample.slice(0, match.index);
  const baselineWrite = new RegExp(
    `snapdiff\\s+(?:capture|update)\\b[^\\n]*--name(?:=|\\s+)${baseline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`,
  );

  if (baselineWrite.test(precedingSteps)) {
    errors.push(`README.md: CI example replaces baseline ${baseline} before verifying it`);
  }
}

if (!ciExample || !verification.test(ciExample)) {
  errors.push('README.md: CI example must verify a named checked-in baseline');
}

if (errors.length > 0) {
  for (const error of errors) console.error(`FAIL: ${error}`);
  process.exit(1);
}

console.log('Package identity and installation documentation are consistent.');
