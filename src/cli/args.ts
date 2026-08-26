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
const GLOBAL_OPTION_KEYS = new Set<keyof CliArgs>(['baseDir', 'color']);
const COMMAND_OPTION_KEYS: Record<string, ReadonlySet<keyof CliArgs>> = {
  capture: new Set(['name', 'from', 'cmd', 'file', 'mode']),
  verify: new Set(['name', 'all']),
  diff: new Set(['name']),
  list: new Set(),
  update: new Set(['name', 'from', 'cmd', 'file']),
  prune: new Set(),
};
const OPTION_LABELS: Partial<Record<keyof CliArgs, string>> = {
  name: '--name',
  from: '--from',
  cmd: '--cmd',
  file: '--file',
  mode: '--mode',
  all: '--all',
  color: '--no-color',
  baseDir: '--base-dir',
};

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
  validateCommandOptions(args);

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
      validateSourceOptions(args, 'capture');
      break;

    case 'verify':
      if (args.name && args.all) {
        console.error('verify accepts either --name or --all, not both');
        process.exit(2);
      }
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
      if (args.from || args.cmd || args.file) {
        if (!args.from) {
          console.error('update source override requires --from (cmd or file)');
          process.exit(2);
        }
        validateSourceOptions(args, 'update');
      }
      break;

    case 'list':
    case 'prune':
      // no required args
      break;
  }
}

function validateCommandOptions(args: CliArgs): void {
  const supported = COMMAND_OPTION_KEYS[args.command];

  for (const key of Object.keys(args) as (keyof CliArgs)[]) {
    if (key === 'command' || GLOBAL_OPTION_KEYS.has(key) || supported.has(key)) continue;
    console.error(`${args.command} does not accept ${OPTION_LABELS[key]}`);
    process.exit(2);
  }
}

function validateSourceOptions(args: CliArgs, command: 'capture' | 'update'): void {
  if (args.from !== 'cmd' && args.from !== 'file') {
    console.error(`${command} --from must be cmd or file`);
    process.exit(2);
  }
  if (args.from === 'cmd' && !args.cmd) {
    console.error(`${command} --from cmd requires --cmd`);
    process.exit(2);
  }
  if (args.from === 'file' && !args.file) {
    console.error(`${command} --from file requires --file`);
    process.exit(2);
  }
  if (args.from === 'cmd' && args.file) {
    console.error(`${command} --from cmd does not accept --file`);
    process.exit(2);
  }
  if (args.from === 'file' && args.cmd) {
    console.error(`${command} --from file does not accept --cmd`);
    process.exit(2);
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

GLOBAL OPTIONS:
  --no-color         Disable color output
  --base-dir <dir>   Base directory for snapshots (default: .)
  -h, --help         Show this help

COMMAND OPTIONS:
  capture  --name, --from, --cmd/--file, --mode
  verify   exactly one of --name or --all
  diff     --name
  update   --name; optional --from with --cmd/--file
  list     no command-specific options
  prune    no command-specific options

EXAMPLES:
  snapdiff capture --from cmd --cmd "mytool --input fixture.json" --name mytool-output
  snapdiff verify --name mytool-output
  snapdiff verify --all
  snapdiff diff --name mytool-output
  snapdiff list
  snapdiff update --name mytool-output
  snapdiff update --from cmd --cmd "newtool --input fixture.json" --name mytool-output
  snapdiff prune
`);
}
