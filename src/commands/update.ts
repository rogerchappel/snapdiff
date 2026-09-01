import { CliArgs } from '../cli/args.js';
import { loadSnapshot, snapshotExists, captureFromCommand, captureFromFile, saveSnapshot } from '../core/snapshot.js';

export async function handleUpdate(args: CliArgs): Promise<void> {
  const name = args.name!;

  if (!(await snapshotExists(name, args.baseDir))) {
    console.error(`Snapshot not found: ${name}`);
    process.exit(2);
  }

  const { meta } = await loadSnapshot(name, args.baseDir);
  const command = args.from === 'cmd' ? args.cmd : args.from === 'file' ? undefined : meta.command;
  const sourceFile = args.from === 'file' ? args.file : args.from === 'cmd' ? undefined : meta.sourceFile;
  const sourceCwd = args.from ? process.cwd() : meta.sourceCwd;
  let actual: string;

  if (command) {
    actual = await captureFromCommand(command, sourceCwd, args.timeoutMs ?? meta.producerTimeoutMs);
  } else if (sourceFile) {
    actual = await captureFromFile(sourceFile, sourceCwd);
  } else {
    console.error('Snapshot has no command or source file recorded');
    process.exit(2);
  }

  await saveSnapshot(name, actual, meta.mode, args.baseDir, command, sourceFile, sourceCwd,
    command ? (args.timeoutMs ?? meta.producerTimeoutMs ?? 30_000) : undefined);

  const bytes = Buffer.byteLength(actual, 'utf-8');
  const lines = actual.split('\n').length;

  console.log(`Snapshot updated: ${name}`);
  console.log(`  Size: ${bytes} bytes, ${lines} lines`);
  console.log(`  Mode: ${meta.mode}`);
}
