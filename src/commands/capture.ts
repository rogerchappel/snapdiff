import { CliArgs } from '../cli/args.js';
import { saveSnapshot, captureFromCommand, captureFromFile } from '../core/snapshot.js';

export async function handleCapture(args: CliArgs): Promise<void> {
  const mode = args.mode ?? 'exact';
  let content: string;

  if (args.from === 'cmd' && args.cmd) {
    console.log(`Executing: ${args.cmd}`);
    content = await captureFromCommand(args.cmd, undefined, args.timeoutMs);
  } else if (args.from === 'file' && args.file) {
    console.log(`Reading file: ${args.file}`);
    content = await captureFromFile(args.file);
  } else {
    console.error('Invalid capture source');
    process.exit(2);
  }

  const { snapPath, metaPath } = await saveSnapshot(
    args.name!,
    content,
    mode,
    args.baseDir,
    args.cmd,
    args.file,
    process.cwd(),
    args.cmd ? (args.timeoutMs ?? 30_000) : undefined
  );

  const lines = content.split('\n').length;
  const bytes = Buffer.byteLength(content, 'utf-8');

  console.log(`Snapshot captured: ${args.name}`);
  console.log(`  Snap: ${snapPath}`);
  console.log(`  Meta: ${metaPath}`);
  console.log(`  Size: ${bytes} bytes, ${lines} lines`);
  console.log(`  Mode: ${mode}`);
}
