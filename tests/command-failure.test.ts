import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleCapture } from '../src/commands/capture.js';
import { handleUpdate } from '../src/commands/update.js';
import { handleVerify } from '../src/commands/verify.js';
import { saveSnapshot } from '../src/core/snapshot.js';
import type { CliArgs } from '../src/cli/args.js';

const TEST_DIR = join(process.cwd(), '.test-command-failures');
const matchingFailure = `node -e "process.stdout.write('stable'); process.stderr.write('producer failed'); process.exit(7)"`;

beforeEach(async () => {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(TEST_DIR, { recursive: true, force: true });
});

function args(overrides: Partial<CliArgs>): CliArgs {
  return { command: 'verify', baseDir: TEST_DIR, color: false, ...overrides } as CliArgs;
}

describe('failed producer commands', () => {
  it('rejects matching stdout during single verification with exit context', async () => {
    await saveSnapshot('failing', 'stable', 'exact', TEST_DIR, matchingFailure);

    await expect(handleVerify(args({ name: 'failing' }))).rejects.toThrow(/exit code 7[\s\S]*producer failed/);
  });

  it('counts a failed command in --all and continues checking snapshots', async () => {
    await saveSnapshot('a-failing', 'stable', 'exact', TEST_DIR, matchingFailure);
    await saveSnapshot('b-passing', 'stable', 'exact', TEST_DIR, `node -e "process.stdout.write('stable')"`);
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const exit = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);

    await expect(handleVerify(args({ all: true }))).rejects.toThrow('exit:1');
    const text = output.mock.calls.flat().join('\n');
    expect(text).toContain('a-failing');
    expect(text).toContain('exit code 7');
    expect(text).toContain('b-passing');
    expect(text).toContain('1 passed, 1 failed');
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('does not create a baseline when capture command fails', async () => {
    await expect(handleCapture(args({ command: 'capture', name: 'new', from: 'cmd', cmd: matchingFailure })))
      .rejects.toThrow('exit code 7');
    await expect(fs.access(join(TEST_DIR, 'snapshots', 'new.snap'))).rejects.toThrow();
    await expect(fs.access(join(TEST_DIR, 'snapshots', 'new.meta.json'))).rejects.toThrow();
  });

  it('does not overwrite a baseline when update command fails', async () => {
    await saveSnapshot('existing', 'stable', 'exact', TEST_DIR, matchingFailure);
    const snapPath = join(TEST_DIR, 'snapshots', 'existing.snap');
    const metaPath = join(TEST_DIR, 'snapshots', 'existing.meta.json');
    const beforeSnap = await fs.readFile(snapPath, 'utf8');
    const beforeMeta = await fs.readFile(metaPath, 'utf8');

    await expect(handleUpdate(args({ command: 'update', name: 'existing' }))).rejects.toThrow('exit code 7');
    expect(await fs.readFile(snapPath, 'utf8')).toBe(beforeSnap);
    expect(await fs.readFile(metaPath, 'utf8')).toBe(beforeMeta);
  });
});
