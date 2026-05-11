import { describe, it, expect } from 'vitest';
import { formatDiff, formatPass, formatFail } from '../src/core/diff.js';

describe('formatDiff', () => {
  it('formats differences with color disabled', () => {
    const output = formatDiff('test', 'hello\nworld', 'hello\nearth', { color: false });
    expect(output).toContain('Snapshot mismatch: test');
    expect(output).toContain('- world');
    expect(output).toContain('+ earth');
  });

  it('includes unchanged context lines', () => {
    const output = formatDiff('test', 'line1\nline2\nline3', 'line1\nchanged\nline3', { color: false });
    expect(output).toContain('  line1');
    expect(output).toContain('  line3');
  });

  it('formats with color codes when enabled', () => {
    const output = formatDiff('test', 'a', 'b', { color: true });
    expect(output).toContain('\x1b['); // contains ANSI color codes
  });
});

describe('formatPass', () => {
  it('formats passing result', () => {
    const output = formatPass('my-snap', { color: false });
    expect(output).toContain('my-snap');
    expect(output).toContain('match');
  });

  it('includes color codes when enabled', () => {
    const output = formatPass('my-snap', { color: true });
    expect(output).toContain('\x1b[');
  });
});

describe('formatFail', () => {
  it('formats failing result', () => {
    const output = formatFail('my-snap', 'some reason', { color: false });
    expect(output).toContain('my-snap');
    expect(output).toContain('mismatch');
    expect(output).toContain('some reason');
  });

  it('formats without optional reason', () => {
    const output = formatFail('my-snap', undefined, { color: false });
    expect(output).toContain('my-snap');
    expect(output).toContain('mismatch');
  });
});
