import { promises as fs } from 'node:fs';
import { join } from 'node:path';

export interface SnapshotMeta {
  name: string;
  captureTime: string;
  mode: 'exact' | 'normalize' | 'json-equiv';
  command?: string;
  sourceFile?: string;
  contentHash: string;
  size: number;
}

export interface SnapshotInfo {
  name: string;
  metaPath: string;
  snapPath: string;
  meta: SnapshotMeta;
}

const SNAPSHOTS_DIR = 'snapshots';
const SNAPSHOT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function assertValidSnapshotName(name: string): void {
  if (!SNAPSHOT_NAME_PATTERN.test(name)) {
    throw new Error(
      'Invalid snapshot name: use only letters, numbers, dots, underscores, and hyphens, starting with a letter or number'
    );
  }
}

function getSnapshotDir(baseDir: string = '.'): string {
  return join(baseDir, SNAPSHOTS_DIR);
}

function getSnapPath(baseDir: string, name: string): string {
  assertValidSnapshotName(name);
  return join(getSnapshotDir(baseDir), `${name}.snap`);
}

function getMetaPath(baseDir: string, name: string): string {
  assertValidSnapshotName(name);
  return join(getSnapshotDir(baseDir), `${name}.meta.json`);
}

async function ensureSnapshotDir(baseDir: string): Promise<void> {
  const dir = getSnapshotDir(baseDir);
  await fs.mkdir(dir, { recursive: true });
}

function computeHash(content: string): string {
  // Simple DJB2-style hash — deterministic, no crypto dependency
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash + content.charCodeAt(i)) & 0xffffffff;
  }
  return hash.toString(16);
}

export async function saveSnapshot(
  name: string,
  content: string,
  mode: 'exact' | 'normalize' | 'json-equiv',
  baseDir: string = '.',
  command?: string,
  sourceFile?: string
): Promise<{ snapPath: string; metaPath: string }> {
  await ensureSnapshotDir(baseDir);

  const snapPath = getSnapPath(baseDir, name);
  const metaPath = getMetaPath(baseDir, name);

  await fs.writeFile(snapPath, content, 'utf-8');

  const meta: SnapshotMeta = {
    name,
    captureTime: new Date().toISOString(),
    mode,
    command,
    sourceFile,
    contentHash: computeHash(content),
    size: content.length,
  };

  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf-8');

  return { snapPath, metaPath };
}

export async function loadSnapshot(
  name: string,
  baseDir: string = '.'
): Promise<{ content: string; meta: SnapshotMeta }> {
  const snapPath = getSnapPath(baseDir, name);
  const metaPath = getMetaPath(baseDir, name);

  const content = await fs.readFile(snapPath, 'utf-8');
  const metaRaw = await fs.readFile(metaPath, 'utf-8');
  const meta = JSON.parse(metaRaw) as SnapshotMeta;

  return { content, meta };
}

export async function snapshotExists(name: string, baseDir: string = '.'): Promise<boolean> {
  const snapPath = getSnapPath(baseDir, name);
  try {
    await fs.access(snapPath);
    return true;
  } catch {
    return false;
  }
}

export async function deleteSnapshot(name: string, baseDir: string = '.'): Promise<void> {
  const snapPath = getSnapPath(baseDir, name);
  const metaPath = getMetaPath(baseDir, name);

  try {
    await fs.unlink(snapPath);
  } catch {
    // ignore if doesn't exist
  }

  try {
    await fs.unlink(metaPath);
  } catch {
    // ignore if doesn't exist
  }
}

export async function listSnapshots(baseDir: string = '.'): Promise<SnapshotInfo[]> {
  const dir = getSnapshotDir(baseDir);

  try {
    const entries = await fs.readdir(dir);
    const metaFiles = entries.filter((e) => e.endsWith('.meta.json'));

    const infos: SnapshotInfo[] = [];

    for (const metaFile of metaFiles) {
      const name = metaFile.replace('.meta.json', '');
      const metaPath = join(dir, metaFile);
      const snapPath = getSnapPath(baseDir, name);

      try {
        const metaRaw = await fs.readFile(metaPath, 'utf-8');
        const meta = JSON.parse(metaRaw) as SnapshotMeta;
        infos.push({ name, metaPath, snapPath, meta });
      } catch {
        // skip corrupted meta files
      }
    }

    return infos.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export async function captureFromCommand(
  cmd: string,
  cwd?: string
): Promise<string> {
  const { exec } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync(cmd, { cwd, maxBuffer: 50 * 1024 * 1024 });
    return stdout;
  } catch (err) {
    // Include stdout even on non-zero exit
    if (err && typeof err === 'object' && 'stdout' in err) {
      return (err as { stdout: string }).stdout;
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Command failed: ${cmd}\n${msg}`);
  }
}

export async function captureFromFile(
  filePath: string
): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}
