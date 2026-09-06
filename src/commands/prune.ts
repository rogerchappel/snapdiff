import { CliArgs } from '../cli/args.js';
import { deleteSnapshot } from '../core/snapshot.js';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

export async function handlePrune(args: CliArgs): Promise<void> {
  const snapshotDir = join(args.baseDir || '.', 'snapshots');
  let entries: string[];

  try {
    entries = await fs.readdir(snapshotDir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('No snapshots directory found.');
      return;
    }
    throw new Error(`Cannot read snapshots directory: ${err instanceof Error ? err.message : String(err)}`);
  }

  const metaFiles = new Set(entries.filter((e) => e.endsWith('.meta.json')).map((e) => e.replace('.meta.json', '')));
  const snapFiles = new Set(entries.filter((e) => e.endsWith('.snap')).map((e) => e.replace('.snap', '')));
  const incompleteNames = new Set([
    ...[...snapFiles].filter((name) => !metaFiles.has(name)),
    ...[...metaFiles].filter((name) => !snapFiles.has(name)),
  ]);

  let pruned = 0;

  for (const name of [...incompleteNames].sort()) {
    try {
      await deleteSnapshot(name, args.baseDir);
    } catch (err) {
      throw new Error(`Cannot delete snapshot "${name}": ${err instanceof Error ? err.message : String(err)}`);
    }
    console.log(`Pruned incomplete snapshot: ${name}`);
    pruned++;
  }

  if (pruned === 0) {
    console.log('No incomplete snapshots found.');
  } else {
    console.log(`\nPruned ${pruned} incomplete snapshot(s).`);
  }
}
