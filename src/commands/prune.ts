import { CliArgs } from '../cli/args.js';
import { deleteSnapshot } from '../core/snapshot.js';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

export async function handlePrune(args: CliArgs): Promise<void> {
  // Read all files in snapshots directory
  const snapshotDir = join(args.baseDir || '.', 'snapshots');

  try {
    const entries = await fs.readdir(snapshotDir);
    // Collect orphaned .snap files (ones without matching .meta.json)
    const metaFiles = new Set(entries.filter((e) => e.endsWith('.meta.json')).map((e) => e.replace('.meta.json', '')));
    const snapFiles = new Set(entries.filter((e) => e.endsWith('.snap')).map((e) => e.replace('.snap', '')));
    const incompleteNames = new Set([
      ...[...snapFiles].filter((name) => !metaFiles.has(name)),
      ...[...metaFiles].filter((name) => !snapFiles.has(name)),
    ]);

    let pruned = 0;

    for (const name of [...incompleteNames].sort()) {
      await deleteSnapshot(name, args.baseDir);
      console.log(`Pruned incomplete snapshot: ${name}`);
      pruned++;
    }

    if (pruned === 0) {
      console.log('No orphaned snapshots found.');
    } else {
      console.log(`\nPruned ${pruned} orphaned snapshot(s).`);
    }
  } catch {
    console.log('No snapshots directory found.');
  }
}
