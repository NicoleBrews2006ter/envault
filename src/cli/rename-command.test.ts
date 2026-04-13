import { Command } from 'commander';
import { registerRenameCommand } from './rename-command';
import * as renameModule from '../commands/rename';

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerRenameCommand(program);
  return program;
}

describe('registerRenameCommand', () => {
  it('calls renameEnvironment with correct arguments', async () => {
    const spy = jest
      .spyOn(renameModule, 'renameEnvironment')
      .mockResolvedValue(undefined);

    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'rename', 'staging', 'uat']);

    expect(spy).toHaveBeenCalledWith('staging', 'uat', expect.objectContaining({}));
    spy.mockRestore();
  });

  it('exits with code 1 on error', async () => {
    const spy = jest
      .spyOn(renameModule, 'renameEnvironment')
      .mockRejectedValue(new Error('does not exist'));

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'rename', 'ghost', 'uat']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('does not exist'));

    spy.mockRestore();
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('prints success message on rename', async () => {
    const spy = jest
      .spyOn(renameModule, 'renameEnvironment')
      .mockResolvedValue(undefined);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'rename', 'dev', 'development']);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('development'));

    spy.mockRestore();
    logSpy.mockRestore();
  });
});
