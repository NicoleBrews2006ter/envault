import { Command } from 'commander';
import { registerRotateCommand } from './rotate-command';
import * as rotateModule from '../commands/rotate';

describe('registerRotateCommand', () => {
  let program: Command;
  let mockRotateKey: jest.SpyInstance;

  beforeEach(() => {
    program = new Command();
    program.exitOverride();
    registerRotateCommand(program);
    mockRotateKey = jest.spyOn(rotateModule, 'rotateKey');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers the rotate command', () => {
    const cmd = program.commands.find((c) => c.name() === 'rotate');
    expect(cmd).toBeDefined();
  });

  it('calls rotateKey with default environment', async () => {
    mockRotateKey.mockResolvedValue({ success: true, backedUp: false });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await program.parseAsync(['node', 'envault', 'rotate']);

    expect(mockRotateKey).toHaveBeenCalledWith({ environment: 'default', force: false });
    consoleSpy.mockRestore();
  });

  it('calls rotateKey with specified environment', async () => {
    mockRotateKey.mockResolvedValue({ success: true, backedUp: true, backupPath: '/tmp/backup.enc' });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await program.parseAsync(['node', 'envault', 'rotate', '--env', 'production']);

    expect(mockRotateKey).toHaveBeenCalledWith({ environment: 'production', force: false });
    consoleSpy.mockRestore();
  });

  it('logs backup path when backup was created', async () => {
    mockRotateKey.mockResolvedValue({ success: true, backedUp: true, backupPath: '/tmp/old.enc' });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await program.parseAsync(['node', 'envault', 'rotate']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('/tmp/old.enc'));
    consoleSpy.mockRestore();
  });

  it('exits with code 1 on failure', async () => {
    mockRotateKey.mockResolvedValue({ success: false, error: 'No config found' });
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

    await expect(program.parseAsync(['node', 'envault', 'rotate'])).rejects.toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(1);

    consoleErrorSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
