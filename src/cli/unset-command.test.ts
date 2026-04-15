import { Command } from 'commander';
import { registerUnsetCommand } from './unset-command';
import * as unsetModule from '../commands/unset';

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerUnsetCommand(program);
  return program;
}

describe('registerUnsetCommand', () => {
  let unsetSpy: jest.SpyInstance;

  beforeEach(() => {
    unsetSpy = jest.spyOn(unsetModule, 'unset');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls unset with key and default env', async () => {
    unsetSpy.mockResolvedValue({ success: true, backedUp: false });
    const program = makeProgram();
    await program.parseAsync(['node', 'test', 'unset', 'MY_VAR']);
    expect(unsetSpy).toHaveBeenCalledWith({
      key: 'MY_VAR',
      environment: 'development',
      backup: true,
    });
  });

  it('calls unset with specified env', async () => {
    unsetSpy.mockResolvedValue({ success: true, backedUp: false });
    const program = makeProgram();
    await program.parseAsync([
      'node', 'test', 'unset', 'API_KEY', '--env', 'production',
    ]);
    expect(unsetSpy).toHaveBeenCalledWith({
      key: 'API_KEY',
      environment: 'production',
      backup: true,
    });
  });

  it('passes backup: false when --no-backup flag is set', async () => {
    unsetSpy.mockResolvedValue({ success: true, backedUp: false });
    const program = makeProgram();
    await program.parseAsync([
      'node', 'test', 'unset', 'SECRET', '--no-backup',
    ]);
    expect(unsetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ backup: false })
    );
  });

  it('exits with code 1 on failure', async () => {
    unsetSpy.mockResolvedValue({ success: false, error: 'Key not found' });
    const program = makeProgram();
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as never);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await program.parseAsync(['node', 'test', 'unset', 'MISSING_KEY']);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith('Error: Key not found');
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
