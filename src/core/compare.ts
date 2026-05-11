/**
 * Comparison modes for snapdiff.
 *
 * - exact: byte-for-byte match
 * - normalize: strip trailing whitespace, normalize line endings
 * - json-equiv: parse as JSON and compare semantically (key-order independent)
 */

export type CompareMode = 'exact' | 'normalize' | 'json-equiv';

function normalizeWhitespace(s: string): string {
  // Normalize line endings to \n, strip trailing whitespace per line, ensure trailing newline
  return s
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '\n');
}

function normalizeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    throw new Error('Not valid JSON');
  }
}

function jsonCanonical(obj: unknown): string {
  // Sort object keys for deterministic comparison
  if (obj === null || obj === undefined) {
    return String(obj);
  }
  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(jsonCanonical).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ':' + jsonCanonical((obj as Record<string, unknown>)[k]));
  return '{' + parts.join(',') + '}';
}

export interface CompareResult {
  match: boolean;
  message?: string;
}

export function compare(expected: string, actual: string, mode: CompareMode): CompareResult {
  switch (mode) {
    case 'exact':
      if (expected === actual) {
        return { match: true };
      }
      return { match: false, message: 'Byte-for-byte mismatch' };

    case 'normalize': {
      const normExpected = normalizeWhitespace(expected);
      const normActual = normalizeWhitespace(actual);
      if (normExpected === normActual) {
        return { match: true };
      }
      return { match: false, message: 'Normalized content mismatch' };
    }

    case 'json-equiv': {
      try {
        const expectedJson = normalizeJson(expected);
        const actualJson = normalizeJson(actual);
        const canonicalExpected = jsonCanonical(expectedJson);
        const canonicalActual = jsonCanonical(actualJson);
        if (canonicalExpected === canonicalActual) {
          return { match: true };
        }
        return { match: false, message: 'JSON-equivalent mismatch' };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { match: false, message: `JSON parse error: ${msg}` };
      }
    }

    default:
      return { match: false, message: `Unknown mode: ${mode}` };
  }
}
