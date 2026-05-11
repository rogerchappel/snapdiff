import { describe, it, expect } from 'vitest';
import { compare } from '../src/core/compare.js';

describe('compare - exact mode', () => {
  it('matches identical strings', () => {
    const result = compare('hello', 'hello', 'exact');
    expect(result.match).toBe(true);
  });

  it('detects differences', () => {
    const result = compare('hello', 'world', 'exact');
    expect(result.match).toBe(false);
    expect(result.message).toContain('Byte-for-byte');
  });

  it('is whitespace-sensitive', () => {
    const result = compare('hello world', 'hello  world', 'exact');
    expect(result.match).toBe(false);
  });
});

describe('compare - normalize mode', () => {
  it('matches with trailing whitespace differences', () => {
    const result = compare('hello   \n', 'hello\n', 'normalize');
    expect(result.match).toBe(true);
  });

  it('normalizes line endings', () => {
    const result = compare('hello\r\nworld\r\n', 'hello\nworld\n', 'normalize');
    expect(result.match).toBe(true);
  });

  it('detects actual content differences', () => {
    const result = compare('hello world', 'goodbye world', 'normalize');
    expect(result.match).toBe(false);
    expect(result.message).toContain('Normalized');
  });
});

describe('compare - json-equiv mode', () => {
  it('matches with different key order', () => {
    const a = '{"a": 1, "b": 2}';
    const b = '{"b": 2, "a": 1}';
    const result = compare(a, b, 'json-equiv');
    expect(result.match).toBe(true);
  });

  it('matches with different whitespace in JSON', () => {
    const a = '{"a": 1, "b": 2}';
    const b = '{ "a" : 1 , "b" : 2 }';
    const result = compare(a, b, 'json-equiv');
    expect(result.match).toBe(true);
  });

  it('detects JSON value differences', () => {
    const a = '{"a": 1}';
    const b = '{"a": 2}';
    const result = compare(a, b, 'json-equiv');
    expect(result.match).toBe(false);
  });

  it('handles invalid JSON gracefully', () => {
    const result = compare('not json', 'also not json', 'json-equiv');
    expect(result.match).toBe(false);
    expect(result.message).toContain('JSON parse error');
  });

  it('handles arrays', () => {
    const a = '[1, 2, 3]';
    const b = '[1,2,3]';
    const result = compare(a, b, 'json-equiv');
    expect(result.match).toBe(true);
  });

  it('handles nested objects', () => {
    const a = '{"outer": {"inner": {"deep": true}}}';
    const b = '{"outer":{"inner":{"deep":true}}}';
    const result = compare(a, b, 'json-equiv');
    expect(result.match).toBe(true);
  });
});
