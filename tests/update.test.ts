import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleUpdate } from '../src/commands/update.js';
import { loadSnapshot, saveSnapshot } from '../src/core/snapshot.js';

const TEST_DIR = join(process.cwd(), '.test-update');

beforeEach(async () => {
  await fs.rm(TEST_DIR, { recursive: true, force: true });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(TEST_DIR, { recursive: true, force: true });
});

describe('update source overrides', () => {
  it('uses and persists a replacement file source', async () => {
    const oldFile = join(TEST_DIR, 'old.txt');
    const newFile = join(TEST_DIR, 'new.txt');
    await fs.mkdir(TEST_DIR, { recursive: true });
    await fs.writeFile(oldFile, 'old');
    await fs.writeFile(newFile, 'new');
    await saveSnapshot('sample', 'old', 'exact', TEST_DIR, undefined, oldFile);

    await handleUpdate({ command: 'update', name: 'sample', from: 'file', file: newFile, baseDir: TEST_DIR });

    const updated = await loadSnapshot('sample', TEST_DIR);
    expect(updated.content).toBe('new');
    expect(updated.meta.sourceFile).toBe(newFile);
    expect(updated.meta.command).toBeUndefined();
  });

  it('uses and persists a replacement command source', async () => {
    await saveSnapshot('sample', 'old', 'exact', TEST_DIR, undefined, 'old.txt');
    const command = `node -e "process.stdout.write('new')"`;

    await handleUpdate({ command: 'update', name: 'sample', from: 'cmd', cmd: command, baseDir: TEST_DIR });

    const updated = await loadSnapshot('sample', TEST_DIR);
    expect(updated.content).toBe('new');
    expect(updated.meta.command).toBe(command);
    expect(updated.meta.sourceFile).toBeUndefined();
  });
});
