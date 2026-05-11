/**
 * Diff output formatter.
 * Produces human-readable, color-coded (optional) unified diffs.
 */

export interface DiffOptions {
  color: boolean;
}

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function color(str: string, code: string): string {
  return code + str + COLORS.reset;
}

function computeUnifiedDiff(expected: string, actual: string): string[] {
  const expectedLines = expected.split('\n');
  const actualLines = actual.split('\n');

  // Simple LCS-based diff
  const lcs = lcsTable(expectedLines, actualLines);
  const diff = backtrackLcs(expectedLines, actualLines, lcs);

  return diff;
}

function lcsTable(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const table: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1;
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
      }
    }
  }

  return table;
}

function backtrackLcs(a: string[], b: string[], table: number[][]): string[] {
  const lines: string[] = [];
  let i = a.length;
  let j = b.length;

  const result: { type: 'context' | 'remove' | 'add'; line: string }[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: 'context', line: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      result.unshift({ type: 'add', line: b[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'remove', line: a[i - 1] });
      i--;
    }
  }

  // Format as unified diff
  for (const item of result) {
    switch (item.type) {
      case 'context':
        lines.push(`  ${item.line}`);
        break;
      case 'remove':
        lines.push(`- ${item.line}`);
        break;
      case 'add':
        lines.push(`+ ${item.line}`);
        break;
    }
  }

  return lines;
}

export function formatDiff(
  name: string,
  expected: string,
  actual: string,
  options: DiffOptions = { color: true }
): string {
  const c = options.color;
  const lines = computeUnifiedDiff(expected, actual);
  const header = c ? color(`Snapshot mismatch: ${name}`, COLORS.bold + COLORS.cyan) : `Snapshot mismatch: ${name}`;

  const formattedLines = lines.map((line) => {
    if (line.startsWith('- ')) {
      return c ? color(line, COLORS.red) : line;
    }
    if (line.startsWith('+ ')) {
      return c ? color(line, COLORS.green) : line;
    }
    return c ? color(line, COLORS.dim) : line;
  });

  return [header, '', ...formattedLines, ''].join('\n');
}

export function formatPass(name: string, options: DiffOptions = { color: true }): string {
  const c = options.color;
  return c ? color(`✓ ${name}  (match)`, COLORS.bold + COLORS.green) : `✓ ${name} (match)`;
}

export function formatFail(name: string, reason?: string, options: DiffOptions = { color: true }): string {
  const c = options.color;
  let msg = c ? color(`✗ ${name}  (mismatch)`, COLORS.bold + COLORS.red) : `✗ ${name} (mismatch)`;
  if (reason) {
    msg += c ? `\n  ${color(reason, COLORS.dim)}` : `\n  ${reason}`;
  }
  return msg;
}
