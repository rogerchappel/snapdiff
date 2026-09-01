import { promises as fs } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

export interface SnapshotMeta {
  name: string;
  captureTime: string;
  mode: 'exact' | 'normalize' | 'json-equiv';
  command?: string;
  sourceFile?: string;
  sourceCwd?: string;
  producerTimeoutMs?: number;
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
const SNAPSHOT_MODES = new Set(['exact', 'normalize', 'json-equiv']);

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

function corruption(name: string, detail: string): Error {
  return new Error(`Snapshot "${name}" is corrupted: ${detail}. Re-capture or restore the snapshot pair.`);
}

function validateMetadata(name: string, value: unknown): SnapshotMeta {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw corruption(name, 'metadata must be a JSON object');
  }
  const meta = value as Record<string, unknown>;
  if (meta.name !== name) throw corruption(name, `metadata name must be "${name}"`);
  if (typeof meta.mode !== 'string' || !SNAPSHOT_MODES.has(meta.mode)) {
    throw corruption(name, 'metadata mode must be exact, normalize, or json-equiv');
  }
  if (typeof meta.captureTime !== 'string' || !Number.isFinite(Date.parse(meta.captureTime))) {
    throw corruption(name, 'metadata captureTime must be a valid timestamp');
  }
  for (const field of ['command', 'sourceFile'] as const) {
    if (meta[field] !== undefined && (typeof meta[field] !== 'string' || meta[field].length === 0)) {
      throw corruption(name, `metadata ${field} must be a non-empty string when present`);
    }
  }
  if (meta.sourceCwd !== undefined &&
      (typeof meta.sourceCwd !== 'string' || !isAbsolute(meta.sourceCwd))) {
    throw corruption(name, 'metadata sourceCwd must be an absolute path when present');
  }
  if (meta.command !== undefined && meta.sourceFile !== undefined) {
    throw corruption(name, 'metadata must not define both command and sourceFile');
  }
  if (meta.producerTimeoutMs !== undefined &&
      (!Number.isSafeInteger(meta.producerTimeoutMs) || (meta.producerTimeoutMs as number) <= 0)) {
    throw corruption(name, 'metadata producerTimeoutMs must be a positive integer when present');
  }
  if (typeof meta.contentHash !== 'string' || !/^-?[0-9a-f]+$/.test(meta.contentHash)) {
    throw corruption(name, 'metadata contentHash must be a hexadecimal string');
  }
  if (!Number.isSafeInteger(meta.size) || (meta.size as number) < 0) {
    throw corruption(name, 'metadata size must be a non-negative integer');
  }
  return meta as unknown as SnapshotMeta;
}

function verifyContent(name: string, content: string, meta: SnapshotMeta): void {
  if (meta.size !== content.length) {
    throw corruption(name, `stored size is ${meta.size}, but the snapshot contains ${content.length} characters`);
  }
  const actualHash = computeHash(content);
  if (meta.contentHash !== actualHash) {
    throw corruption(name, `stored contentHash is ${meta.contentHash}, but the snapshot hashes to ${actualHash}`);
  }
}

export async function saveSnapshot(
  name: string,
  content: string,
  mode: 'exact' | 'normalize' | 'json-equiv',
  baseDir: string = '.',
  command?: string,
  sourceFile?: string,
  sourceCwd?: string,
  producerTimeoutMs?: number
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
    sourceCwd,
    producerTimeoutMs,
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
  let parsed: unknown;
  try {
    parsed = JSON.parse(metaRaw);
  } catch {
    throw corruption(name, 'invalid metadata JSON');
  }
  const meta = validateMetadata(name, parsed);
  verifyContent(name, content, meta);

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
  let entries: string[];

  try {
    entries = await fs.readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw new Error(`Cannot read snapshots directory: ${err instanceof Error ? err.message : String(err)}`);
  }

  const metaNames = new Set(entries.filter((entry) => entry.endsWith('.meta.json')).map((entry) => entry.slice(0, -'.meta.json'.length)));
  const snapNames = new Set(entries.filter((entry) => entry.endsWith('.snap')).map((entry) => entry.slice(0, -'.snap'.length)));

  for (const name of [...metaNames].sort()) {
    if (!snapNames.has(name)) throw new Error(`Invalid snapshot "${name}": missing .snap file`);
  }
  for (const name of [...snapNames].sort()) {
    if (!metaNames.has(name)) throw new Error(`Invalid snapshot "${name}": missing .meta.json file`);
  }

  const infos: SnapshotInfo[] = [];
  for (const name of [...metaNames].sort()) {
    const metaPath = getMetaPath(baseDir, name);
    const snapPath = getSnapPath(baseDir, name);
    const { meta } = await loadSnapshot(name, baseDir);
    infos.push({ name, metaPath, snapPath, meta });
  }

  return infos;
}

export async function captureFromCommand(
  cmd: string,
  cwd?: string,
  timeoutMs: number = 30_000
): Promise<string> {
  const { exec } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync(cmd, { cwd, timeout: timeoutMs, killSignal: 'SIGTERM', maxBuffer: 50 * 1024 * 1024 });
    return stdout;
  } catch (err) {
    const details = err && typeof err === 'object'
      ? err as { code?: string | number; stderr?: string; message?: string; killed?: boolean; signal?: string }
      : undefined;
    const exitContext = details?.code !== undefined ? ` (exit code ${details.code})` : '';
    const stderr = details?.stderr?.trim();
    const reason = stderr || details?.message || String(err);
    const timeoutContext = details?.killed || details?.signal === 'SIGTERM'
      ? ` timed out after ${timeoutMs} ms`
      : '';
    throw new Error(`Command failed${exitContext}${timeoutContext}: ${cmd}\n${reason}`);
  }
}

export async function captureFromFile(
  filePath: string,
  cwd?: string
): Promise<string> {
  const resolvedPath = cwd && !isAbsolute(filePath) ? resolve(cwd, filePath) : filePath;
  return fs.readFile(resolvedPath, 'utf-8');
}
