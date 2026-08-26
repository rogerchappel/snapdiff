import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseArgs } from '../src/cli/args.js';

describe('parseArgs', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses capture command with --from cmd', () => {
    const args = parseArgs(['node', 'snapdiff', 'capture', '--name', 'test', '--from', 'cmd', '--cmd', 'echo hello']);
    expect(args.command).toBe('capture');
    expect(args.name).toBe('test');
    expect(args.from).toBe('cmd');
    expect(args.cmd).toBe('echo hello');
  });

  it('parses capture command with --from file', () => {
    const args = parseArgs(['node', 'snapdiff', 'capture', '--name', 'test', '--from', 'file', '--file', 'path/to/file.txt']);
    expect(args.command).toBe('capture');
    expect(args.from).toBe('file');
    expect(args.file).toBe('path/to/file.txt');
  });

  it('parses verify command with --name', () => {
    const args = parseArgs(['node', 'snapdiff', 'verify', '--name', 'test']);
    expect(args.command).toBe('verify');
    expect(args.name).toBe('test');
  });

  it('parses verify command with --all', () => {
    const args = parseArgs(['node', 'snapdiff', 'verify', '--all']);
    expect(args.command).toBe('verify');
    expect(args.all).toBe(true);
  });

  it('parses diff command', () => {
    const args = parseArgs(['node', 'snapdiff', 'diff', '--name', 'test']);
    expect(args.command).toBe('diff');
    expect(args.name).toBe('test');
  });

  it('parses list command', () => {
    const args = parseArgs(['node', 'snapdiff', 'list']);
    expect(args.command).toBe('list');
  });

  it('parses update command', () => {
    const args = parseArgs(['node', 'snapdiff', 'update', '--name', 'test']);
    expect(args.command).toBe('update');
    expect(args.name).toBe('test');
  });

  it('parses an update source override', () => {
    const args = parseArgs(['node', 'snapdiff', 'update', '--name', 'test', '--from', 'file', '--file', 'new.txt']);
    expect(args).toMatchObject({ command: 'update', name: 'test', from: 'file', file: 'new.txt' });
  });

  it.each([
    [['--cmd', 'echo ignored'], 'update source override requires --from (cmd or file)'],
    [['--from', 'cmd'], 'update --from cmd requires --cmd'],
    [['--from', 'file'], 'update --from file requires --file'],
    [['--from', 'cmd', '--cmd', 'echo ok', '--file', 'ignored'], 'update --from cmd does not accept --file'],
    [['--from', 'other', '--cmd', 'echo ignored'], 'update --from must be cmd or file'],
  ])('rejects an incoherent update source override: %j', (sourceArgs, message) => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as (code?: number) => never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => parseArgs(['node', 'snapdiff', 'update', '--name', 'test', ...sourceArgs]))
      .toThrow('process.exit called');
    expect(errorSpy).toHaveBeenCalledWith(message);
    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it('parses prune command', () => {
    const args = parseArgs(['node', 'snapdiff', 'prune']);
    expect(args.command).toBe('prune');
  });

  it('parses --mode option', () => {
    const args = parseArgs(['node', 'snapdiff', 'capture', '--name', 'test', '--from', 'file', '--file', 'f.txt', '--mode', 'normalize']);
    expect(args.mode).toBe('normalize');
  });

  it('parses --no-color option', () => {
    const args = parseArgs(['node', 'snapdiff', 'verify', '--name', 'test', '--no-color']);
    expect(args.color).toBe(false);
  });

  it('parses --base-dir option', () => {
    const args = parseArgs(['node', 'snapdiff', 'list', '--base-dir', '/tmp']);
    expect(args.baseDir).toBe('/tmp');
  });

  it.each([
    ['list', ['--name', 'ignored'], '--name'],
    ['prune', ['--name', 'ignored'], '--name'],
    ['verify', ['--mode', 'exact', '--name', 'test'], '--mode'],
    ['diff', ['--all', '--name', 'test'], '--all'],
    ['update', ['--mode', 'normalize', '--name', 'test'], '--mode'],
  ])('rejects %s with unsupported option %s', (command, options, unsupported) => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as (code?: number) => never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => parseArgs(['node', 'snapdiff', command, ...options]))
      .toThrow('process.exit called');
    expect(errorSpy).toHaveBeenCalledWith(`${command} does not accept ${unsupported}`);
    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it('rejects verify with both --all and --name', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as (code?: number) => never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => parseArgs(['node', 'snapdiff', 'verify', '--all', '--name', 'test']))
      .toThrow('process.exit called');
    expect(errorSpy).toHaveBeenCalledWith('verify accepts either --name or --all, not both');
    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it('exits with code 2 for an invalid comparison mode', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as (code?: number) => never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => parseArgs([
      'node', 'snapdiff', 'capture', '--name', 'test', '--from', 'file',
      '--file', 'f.txt', '--mode', 'bogus',
    ])).toThrow('process.exit called');
    expect(errorSpy).toHaveBeenCalledWith(
      'Invalid value for --mode: bogus (expected exact, normalize, or json-equiv)'
    );
    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it.each(['--name', '--from', '--cmd', '--file', '--mode', '--base-dir'])(
    'exits with code 2 when %s has no value',
    (option) => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit called');
      }) as (code?: number) => never);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => parseArgs(['node', 'snapdiff', 'list', option])).toThrow('process.exit called');
      expect(errorSpy).toHaveBeenCalledWith(`Missing value for ${option}`);
      expect(exitSpy).toHaveBeenCalledWith(2);
    }
  );

  it('does not consume another option as a value', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as (code?: number) => never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => parseArgs(['node', 'snapdiff', 'list', '--base-dir', '--no-color']))
      .toThrow('process.exit called');
    expect(errorSpy).toHaveBeenCalledWith('Missing value for --base-dir');
    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it('defaults to exact mode when --mode not specified', () => {
    const args = parseArgs(['node', 'snapdiff', 'verify', '--name', 'test']);
    expect(args.mode).toBeUndefined();
  });

  it('exits with code 2 on unknown command', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as (code?: number) => never);
    expect(() => parseArgs(['node', 'snapdiff', 'foobar'])).toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it('shows help on --help', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as (code?: number) => never);
    expect(() => parseArgs(['node', 'snapdiff', '--help'])).toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('exits with code 2 on missing required args for capture', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as (code?: number) => never);
    expect(() => parseArgs(['node', 'snapdiff', 'capture'])).toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it('exits with code 2 on verify without --name or --all', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as (code?: number) => never);
    expect(() => parseArgs(['node', 'snapdiff', 'verify'])).toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it.each(['capture', 'verify', 'diff', 'update'])('rejects unsafe snapshot names for %s', (command) => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as (code?: number) => never);
    const commandArgs = command === 'capture'
      ? ['--from', 'file', '--file', 'fixture.txt']
      : [];

    expect(() => parseArgs(['node', 'snapdiff', command, '--name', '../escaped', ...commandArgs]))
      .toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(2);
  });
});
