/**
 * CLI argument parser for snapdiff.
 * Supports: capture, verify, diff, list, update, prune
 */

import { assertValidSnapshotName } from '../core/snapshot.js';

export interface CliArgs {
  command: string;
  name?: string;
  from?: 'cmd' | 'file';
  cmd?: string;
  file?: string;
  mode?: 'exact' | 'normalize' | 'json-equiv';
  all?: boolean;
  color?: boolean;
  baseDir?: string;
}

const VALUE_OPTIONS = new Set(['--name', '--from', '--cmd', '--file', '--mode', '--base-dir']);
const FLAG_OPTIONS = new Set(['--all', '--no-color', '--help', '-h']);
const VALID_MODES = ['exact', 'normalize', 'json-equiv'] as const;

function requireOptionValue(args: string[], index: number, option: string): string {
  const value = args[index + 1];

  if (value === undefined || value === '' || VALUE_OPTIONS.has(value) || FLAG_OPTIONS.has(value)) {
    console.error(`Missing value for ${option}`);
    process.exit(2);
  }

  return value;
}

export function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2); // skip node and script path

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    process.exit(0);
  }

  const command = args[0];
  const validCommands = ['capture', 'verify', 'diff', 'list', 'update', 'prune'];

  if (!validCommands.includes(command)) {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(2);
  }

  const parsed: CliArgs = { command };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--name':
        parsed.name = requireOptionValue(args, i, arg);
        i++;
        break;
      case '--from':
        parsed.from = requireOptionValue(args, i, arg) as 'cmd' | 'file';
        i++;
        break;
      case '--cmd':
        parsed.cmd = requireOptionValue(args, i, arg);
        i++;
        break;
      case '--file':
        parsed.file = requireOptionValue(args, i, arg);
        i++;
        break;
      case '--mode': {
        const mode = requireOptionValue(args, i, arg);
        if (!VALID_MODES.includes(mode as typeof VALID_MODES[number])) {
          console.error(`Invalid value for --mode: ${mode} (expected exact, normalize, or json-equiv)`);
          process.exit(2);
        }
        parsed.mode = mode as typeof VALID_MODES[number];
        i++;
        break;
      }
      case '--all':
        parsed.all = true;
        break;
      case '--no-color':
        parsed.color = false;
        break;
      case '--base-dir':
        parsed.baseDir = requireOptionValue(args, i, arg);
        i++;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        printHelp();
        process.exit(2);
    }
  }

  validateArgs(parsed);
  return parsed;
}

function validateArgs(args: CliArgs): void {
  if (args.name) {
    try {
      assertValidSnapshotName(args.name);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(2);
    }
  }

  switch (args.command) {
    case 'capture':
      if (!args.name) {
        console.error('capture requires --name');
        process.exit(2);
      }
      if (!args.from) {
        console.error('capture requires --from (cmd or file)');
        process.exit(2);
      }
      if (args.from === 'cmd' && !args.cmd) {
        console.error('capture --from cmd requires --cmd');
        process.exit(2);
      }
      if (args.from === 'file' && !args.file) {
        console.error('capture --from file requires --file');
        process.exit(2);
      }
      break;

    case 'verify':
      if (!args.name && !args.all) {
        console.error('verify requires --name or --all');
        process.exit(2);
      }
      break;

    case 'diff':
      if (!args.name) {
        console.error('diff requires --name');
        process.exit(2);
      }
      break;

    case 'update':
      if (!args.name) {
        console.error('update requires --name');
        process.exit(2);
      }
      break;

    case 'list':
    case 'prune':
      // no required args
      break;
  }
}

function printHelp(): void {
  console.log(`
snapdiff — deterministic output snapshot testing

USAGE:
  snapdiff <command> [options]

COMMANDS:
  capture  Capture a new snapshot from command output or file
  verify   Verify current output against stored snapshot(s)
  diff     Show human-readable diff between stored and current
  list     List all stored snapshots
  update   Accept current output as new baseline
  prune    Remove unused snapshot files

OPTIONS:
  --name <name>      Snapshot name (letters, numbers, dots, underscores, hyphens)
  --from <cmd|file>  Capture source: command or file
  --cmd <command>    Command to execute (with --from cmd)
  --file <path>      File to read (with --from file)
  --mode <mode>      Comparison mode: exact, normalize, json-equiv (default: exact)
  --all              Verify all snapshots
  --no-color         Disable color output
  --base-dir <dir>   Base directory for snapshots (default: .)
  -h, --help         Show this help

EXAMPLES:
  snapdiff capture --from cmd --cmd "mytool --input fixture.json" --name mytool-output
  snapdiff verify --name mytool-output
  snapdiff verify --all
  snapdiff diff --name mytool-output
  snapdiff list
  snapdiff update --name mytool-output
  snapdiff prune
`);
}
