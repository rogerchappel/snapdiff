import { CliArgs } from '../cli/args.js';
import { listSnapshots } from '../core/snapshot.js';

export async function handleList(args: CliArgs): Promise<void> {
  const snapshots = await listSnapshots(args.baseDir);

  if (snapshots.length === 0) {
    console.log('No snapshots found.');
    return;
  }

  console.log(`Found ${snapshots.length} snapshot(s):\n`);

  for (const info of snapshots) {
    const age = getAge(info.meta.captureTime);
    console.log(`  ${info.name}`);
    console.log(`    Mode: ${info.meta.mode}`);
    console.log(`    Captured: ${info.meta.captureTime} (${age})`);
    console.log(`    Size: ${info.meta.size} bytes`);
    if (info.meta.command) {
      console.log(`    Command: ${info.meta.command}`);
    }
    if (info.meta.sourceFile) {
      console.log(`    File: ${info.meta.sourceFile}`);
    }
    console.log('');
  }
}

function getAge(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
