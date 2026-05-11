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
});
