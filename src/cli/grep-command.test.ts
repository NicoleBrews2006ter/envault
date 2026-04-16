import { Command } from 'commander';
import { registerGrepCommand } from './grep-command';
import * as grepModule from '../commands/grep';

function makeProgram() {
  const program = new Command();
  program.exitOverride();
  registerGrepCommand(program);
  return program;
}

describe('registerGrepCommand', () => {
  let grepSpy: jest.SpyInstance;

  beforeEach(() => {
    grepSpy = jest.spyOn(grepModule, 'grep');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls grep with default options', async () => {
    grepSpy.mockResolvedValue([{ key: 'API_KEY', value: 'secret' }]);
    const program = makeProgram();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await program.parseAsync(['node', 'test', 'grep', 'API']);

    expect(grepSpy).toHaveBeenCalledWith(expect.any(String), {
      pattern: 'API',
      environment: 'default',
      keysOnly: false,
      valuesOnly: false,
      ignoreCase: false,
    });
    consoleSpy.mockRestore();
  });

  it('prints no matches message when results are empty', async () => {
    grepSpy.mockResolvedValue([]);
    const program = makeProgram();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await program.parseAsync(['node', 'test', 'grep', 'NOTHING']);

    expect(consoleSpy).toHaveBeenCalledWith('No matches found.');
    consoleSpy.mockRestore();
  });

  it('passes ignoreCase and keysOnly flags', async () => {
    grepSpy.mockResolvedValue([{ key: 'DB_HOST', value: 'localhost' }]);
    const program = makeProgram();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await program.parseAsync(['node', 'test', 'grep', 'db', '--ignore-case', '--keys-only']);

    expect(grepSpy).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      ignoreCase: true,
      keysOnly: true,
    }));
    consoleSpy.mockRestore();
  });

  it('exits with error when grep throws', async () => {
    grepSpy.mockRejectedValue(new Error('not initialized'));
    const program = makeProgram();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

    await expect(program.parseAsync(['node', 'test', 'grep', 'KEY'])).rejects.toThrow('exit');
    expect(errorSpy).toHaveBeenCalledWith('Error: not initialized');
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
