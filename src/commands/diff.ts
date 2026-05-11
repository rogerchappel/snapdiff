import { CliArgs } from '../cli/args.js';
import { loadSnapshot, snapshotExists, captureFromCommand, captureFromFile } from '../core/snapshot.js';
import { compare } from '../core/compare.js';
import { formatDiff } from '../core/diff.js';

export async function handleDiff(args: CliArgs): Promise<void> {
  const name = args.name!;
  const color = args.color !== false;

  if (!(await snapshotExists(name, args.baseDir))) {
    console.error(`Snapshot not found: ${name}`);
    process.exit(2);
  }

  const { content: expected, meta } = await loadSnapshot(name, args.baseDir);
  let actual: string;

  if (meta.command) {
    actual = await captureFromCommand(meta.command);
  } else if (meta.sourceFile) {
    actual = await captureFromFile(meta.sourceFile);
  } else {
    console.error('Snapshot has no command or source file recorded');
    process.exit(2);
  }

  const result = compare(expected, actual, meta.mode);

  if (result.match) {
    console.log('No differences found.');
  } else {
    const diffOutput = formatDiff(name, expected, actual, { color });
    console.log(diffOutput);
    process.exit(1);
  }
}
