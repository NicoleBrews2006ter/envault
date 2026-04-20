import { Command } from 'commander';
import { registerKeysCommand } from './keys-command';
import * as keysModule from '../commands/keys';

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerKeysCommand(program);
  return program;
}

describe('keys-command', () => {
  let consoleSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('prints table of keys', async () => {
    jest.spyOn(keysModule, 'keys').mockResolvedValue([
      { environment: 'production', fingerprint: 'abcd1234abcd1234', createdAt: '2024-06-01T00:00:00.000Z', algorithm: 'aes-256-gcm' },
    ]);
    const program = makeProgram();
    await program.parseAsync(['keys'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ENVIRONMENT'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('production'));
  });

  it('prints message when no keys found', async () => {
    jest.spyOn(keysModule, 'keys').mockResolvedValue([]);
    const program = makeProgram();
    await program.parseAsync(['keys'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith('No keys found for this project.');
  });

  it('outputs JSON when --json flag is set', async () => {
    const mockEntries = [
      { environment: 'staging', fingerprint: 'deadbeefdeadbeef', createdAt: '2024-01-15T00:00:00.000Z', algorithm: 'aes-256-gcm' },
    ];
    jest.spyOn(keysModule, 'keys').mockResolvedValue(mockEntries);
    const program = makeProgram();
    await program.parseAsync(['keys', '--json'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockEntries, null, 2));
  });

  it('handles errors gracefully', async () => {
    jest.spyOn(keysModule, 'keys').mockRejectedValue(new Error('No envault project found'));
    const program = makeProgram();
    await expect(program.parseAsync(['keys'], { from: 'user' })).rejects.toThrow('exit');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('No envault project found'));
  });
});
