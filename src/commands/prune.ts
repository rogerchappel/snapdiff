import { CliArgs } from '../cli/args.js';
import { listSnapshots, deleteSnapshot } from '../core/snapshot.js';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

export async function handlePrune(args: CliArgs): Promise<void> {
  const snapshots = await listSnapshots(args.baseDir);
  const snapshotNames = new Set(snapshots.map((s) => s.name));

  // Read all files in snapshots directory
  const snapshotDir = join(args.baseDir || '.', 'snapshots');

  try {
    const entries = await fs.readdir(snapshotDir);
    // Collect orphaned .snap files (ones without matching .meta.json)
    const metaFiles = new Set(entries.filter((e) => e.endsWith('.meta.json')).map((e) => e.replace('.meta.json', '')));
    const snapFiles = entries.filter((e) => e.endsWith('.snap') && !e.endsWith('.meta.json'));

    let pruned = 0;

    for (const snapFile of snapFiles) {
      const name = snapFile.replace('.snap', '');
      if (!snapshotNames.has(name) || !metaFiles.has(name)) {
        await deleteSnapshot(name, args.baseDir);
        console.log(`Pruned: ${name}`);
        pruned++;
      }
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
