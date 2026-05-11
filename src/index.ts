#!/usr/bin/env node

import { parseArgs } from './cli/args.js';
import { handleCapture } from './commands/capture.js';
import { handleVerify } from './commands/verify.js';
import { handleDiff } from './commands/diff.js';
import { handleList } from './commands/list.js';
import { handleUpdate } from './commands/update.js';
import { handlePrune } from './commands/prune.js';

async function main() {
  const args = parseArgs(process.argv);

  try {
    switch (args.command) {
      case 'capture':
        await handleCapture(args);
        break;
      case 'verify':
        await handleVerify(args);
        break;
      case 'diff':
        await handleDiff(args);
        break;
      case 'list':
        await handleList(args);
        break;
      case 'update':
        await handleUpdate(args);
        break;
      case 'prune':
        await handlePrune(args);
        break;
      default:
        console.error(`Unknown command: ${args.command}`);
        process.exit(2);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${msg}`);
    process.exit(2);
  }
}

main();
