import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { saveSnapshot, loadSnapshot, snapshotExists, deleteSnapshot, listSnapshots } from '../src/core/snapshot.js';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(process.cwd(), 'tests', 'tmp-snapshots');

beforeEach(async () => {
  await fs.mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe('saveSnapshot', () => {
  it('creates .snap and .meta.json files', async () => {
    const { snapPath, metaPath } = await saveSnapshot('test-snap', 'hello', 'exact', TEST_DIR);
    expect(await fs.readFile(snapPath, 'utf-8')).toBe('hello');
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
    expect(meta.name).toBe('test-snap');
    expect(meta.mode).toBe('exact');
    expect(meta.size).toBe(5);
  });

  it('records command metadata', async () => {
    const { metaPath } = await saveSnapshot('cmd-snap', 'output', 'exact', TEST_DIR, 'echo test', undefined);
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
    expect(meta.command).toBe('echo test');
  });

  it('records file metadata', async () => {
    const { metaPath } = await saveSnapshot('file-snap', 'content', 'normalize', TEST_DIR, undefined, 'examples/fixture.txt');
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
    expect(meta.sourceFile).toBe('examples/fixture.txt');
    expect(meta.mode).toBe('normalize');
  });

  it.each(['../escaped', '../../escaped', '/tmp/escaped', String.raw`..\escaped`, '.', '..', 'nested/name'])(
    'rejects unsafe snapshot name %j',
    async (name) => {
      await expect(saveSnapshot(name, 'unsafe', 'exact', TEST_DIR)).rejects.toThrow('Invalid snapshot name');
    }
  );
});

describe('snapshot path safety', () => {
  it('rejects traversal before reading or deleting files outside snapshots', async () => {
    const outsidePath = join(TEST_DIR, 'escaped.snap');
    await fs.writeFile(outsidePath, 'sentinel', 'utf-8');

    await expect(loadSnapshot('../escaped', TEST_DIR)).rejects.toThrow('Invalid snapshot name');
    await expect(snapshotExists('../escaped', TEST_DIR)).rejects.toThrow('Invalid snapshot name');
    await expect(deleteSnapshot('../escaped', TEST_DIR)).rejects.toThrow('Invalid snapshot name');
    expect(await fs.readFile(outsidePath, 'utf-8')).toBe('sentinel');
  });
});

describe('loadSnapshot', () => {
  it('loads previously saved snapshot', async () => {
    await saveSnapshot('load-test', 'world', 'exact', TEST_DIR);
    const { content, meta } = await loadSnapshot('load-test', TEST_DIR);
    expect(content).toBe('world');
    expect(meta.name).toBe('load-test');
  });
});

describe('snapshotExists', () => {
  it('returns true for existing snapshots', async () => {
    await saveSnapshot('exists-test', 'data', 'exact', TEST_DIR);
    expect(await snapshotExists('exists-test', TEST_DIR)).toBe(true);
  });

  it('returns false for non-existent snapshots', async () => {
    expect(await snapshotExists('nope', TEST_DIR)).toBe(false);
  });
});

describe('deleteSnapshot', () => {
  it('removes snapshot files', async () => {
    await saveSnapshot('delete-me', 'gone', 'exact', TEST_DIR);
    expect(await snapshotExists('delete-me', TEST_DIR)).toBe(true);
    await deleteSnapshot('delete-me', TEST_DIR);
    expect(await snapshotExists('delete-me', TEST_DIR)).toBe(false);
  });
});

describe('listSnapshots', () => {
  it('returns empty array when no snapshots exist', async () => {
    const list = await listSnapshots(TEST_DIR);
    expect(list).toHaveLength(0);
  });

  it('returns all snapshots sorted by name', async () => {
    await saveSnapshot('zzz-snap', 'a', 'exact', TEST_DIR);
    await saveSnapshot('aaa-snap', 'b', 'exact', TEST_DIR);
    await saveSnapshot('mmm-snap', 'c', 'exact', TEST_DIR);

    const list = await listSnapshots(TEST_DIR);
    expect(list).toHaveLength(3);
    expect(list[0].name).toBe('aaa-snap');
    expect(list[1].name).toBe('mmm-snap');
    expect(list[2].name).toBe('zzz-snap');
  });

  it('rejects malformed metadata with the snapshot name', async () => {
    const dir = join(TEST_DIR, 'snapshots');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, 'broken.snap'), 'expected');
    await fs.writeFile(join(dir, 'broken.meta.json'), '{not-json');

    await expect(listSnapshots(TEST_DIR)).rejects.toThrow(/broken.*invalid metadata/i);
  });

  it.each([
    ['missing-content', 'missing-content.meta.json'],
    ['missing-metadata', 'missing-metadata.snap'],
  ])('rejects incomplete snapshot pair %s', async (name, fileName) => {
    const dir = join(TEST_DIR, 'snapshots');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, fileName), fileName.endsWith('.json') ? '{}' : 'expected');

    await expect(listSnapshots(TEST_DIR)).rejects.toThrow(new RegExp(`${name}.*missing`, 'i'));
  });
});
