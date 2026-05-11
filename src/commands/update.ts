import { CliArgs } from '../cli/args.js';
import { loadSnapshot, snapshotExists, captureFromCommand, captureFromFile, saveSnapshot } from '../core/snapshot.js';

export async function handleUpdate(args: CliArgs): Promise<void> {
  const name = args.name!;

  if (!(await snapshotExists(name, args.baseDir))) {
    console.error(`Snapshot not found: ${name}`);
    process.exit(2);
  }

  const { meta } = await loadSnapshot(name, args.baseDir);
  let actual: string;

  if (meta.command) {
    actual = await captureFromCommand(meta.command);
  } else if (meta.sourceFile) {
    actual = await captureFromFile(meta.sourceFile);
  } else {
    console.error('Snapshot has no command or source file recorded');
    process.exit(2);
  }

  await saveSnapshot(name, actual, meta.mode, args.baseDir, meta.command, meta.sourceFile);

  const bytes = Buffer.byteLength(actual, 'utf-8');
  const lines = actual.split('\n').length;

  console.log(`Snapshot updated: ${name}`);
  console.log(`  Size: ${bytes} bytes, ${lines} lines`);
  console.log(`  Mode: ${meta.mode}`);
}
