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
];

for (const [description, pattern] of requiredGuidance) {
  if (!pattern.test(readme)) errors.push(`README.md: missing guidance: ${description}`);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`FAIL: ${error}`);
  process.exit(1);
}

console.log('Package identity and installation documentation are consistent.');
