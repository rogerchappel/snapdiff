import { CliArgs } from '../cli/args.js';
import { loadSnapshot, snapshotExists, listSnapshots, captureFromCommand, captureFromFile } from '../core/snapshot.js';
import { compare } from '../core/compare.js';
import { formatDiff, formatPass, formatFail } from '../core/diff.js';

export async function handleVerify(args: CliArgs): Promise<void> {
  const color = args.color !== false;

  if (args.all) {
    await verifyAll(args.baseDir, color);
    return;
  }

  const name = args.name!;
  const result = await verifySingle(name, args.baseDir, color);
  process.exit(result ? 0 : 1);
}

async function verifySingle(name: string, baseDir: string = '.', color: boolean): Promise<boolean> {
  if (!(await snapshotExists(name, baseDir))) {
    console.error(`Snapshot not found: ${name}`);
    process.exit(2);
  }

  const { content: expected, meta } = await loadSnapshot(name, baseDir);
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
    console.log(formatPass(name, { color }));
    return true;
  } else {
    console.log(formatFail(name, result.message, { color }));
    const diff = formatDiff(name, expected, actual, { color });
    console.log(diff);
    return false;
  }
}

async function verifyAll(baseDir: string = '.', color: boolean): Promise<void> {
  const snapshots = await listSnapshots(baseDir);

  if (snapshots.length === 0) {
    console.log('No snapshots found.');
    return;
  }

  let passCount = 0;
  let failCount = 0;

  for (const info of snapshots) {
    let actual: string;

    try {
      if (info.meta.command) {
        actual = await captureFromCommand(info.meta.command);
      } else if (info.meta.sourceFile) {
        actual = await captureFromFile(info.meta.sourceFile);
      } else {
        console.log(formatFail(info.name, 'no command or source file', { color }));
        failCount++;
        continue;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(formatFail(info.name, message, { color }));
      failCount++;
      continue;
    }

    const result = compare(info.meta.contentHash ? (await loadSnapshot(info.name, baseDir)).content : '', actual, info.meta.mode);

    if (result.match) {
      console.log(formatPass(info.name, { color }));
      passCount++;
    } else {
      console.log(formatFail(info.name, result.message, { color }));
      failCount++;
    }
  }

  console.log(`\n${passCount} passed, ${failCount} failed`);
  process.exit(failCount > 0 ? 1 : 0);
}
