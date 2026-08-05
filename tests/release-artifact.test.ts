import { describe, expect, it } from 'vitest';
import { validateRelease } from '../scripts/validate-release-artifact.mjs';

const manifest = { name: '@rogerchappel/snapdiff', version: '0.1.0' };
const valid = {
  tag: 'v0.1.0',
  manifest,
  artifactManifest: manifest,
  artifact: '/tmp/rogerchappel-snapdiff-0.1.0.tgz',
};

describe('release artifact validation', () => {
  it('accepts a tag and packed artifact matching package.json', () => {
    expect(validateRelease(valid)).toEqual([]);
  });

  it('rejects a mismatched release tag', () => {
    expect(validateRelease({ ...valid, tag: 'v0.2.0' })).toContain(
      'release tag v0.2.0 does not match package version v0.1.0',
    );
  });

  it('rejects mismatched artifact metadata and filename', () => {
    const errors = validateRelease({
      ...valid,
      artifactManifest: { name: '@rogerchappel/other', version: '9.0.0' },
      artifact: '/tmp/wrong.tgz',
    });
    expect(errors).toHaveLength(3);
    expect(errors.join('\n')).toMatch(/artifact package/);
    expect(errors.join('\n')).toMatch(/artifact version/);
    expect(errors.join('\n')).toMatch(/artifact filename/);
  });
});
