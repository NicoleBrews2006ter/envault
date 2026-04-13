import { Command } from 'commander';
import { registerTagCommand } from './tag-command';
import * as tagModule from '../commands/tag';

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerTagCommand(program);
  return program;
}

describe('registerTagCommand', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('tag add calls tagEnvironment and logs success', async () => {
    jest.spyOn(tagModule, 'tagEnvironment').mockResolvedValue(undefined);
    const program = makeProgram();
    await program.parseAsync(['node', 'test', 'tag', 'add', 'production', 'stable']);
    expect(tagModule.tagEnvironment).toHaveBeenCalledWith('production', 'stable', undefined);
    expect(consoleLogSpy).toHaveBeenCalledWith('Tag "stable" added to environment "production"');
  });

  it('tag add logs error and exits on failure', async () => {
    jest.spyOn(tagModule, 'tagEnvironment').mockRejectedValue(new Error('env not found'));
    const program = makeProgram();
    await program.parseAsync(['node', 'test', 'tag', 'add', 'staging', 'v1']);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error: env not found');
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('tag remove calls removeTag and logs success', async () => {
    jest.spyOn(tagModule, 'removeTag').mockResolvedValue(undefined);
    const program = makeProgram();
    await program.parseAsync(['node', 'test', 'tag', 'remove', 'production', 'stable']);
    expect(tagModule.removeTag).toHaveBeenCalledWith('production', 'stable', undefined);
    expect(consoleLogSpy).toHaveBeenCalledWith('Tag "stable" removed from environment "production"');
  });

  it('tag list prints tags per environment', async () => {
    jest.spyOn(tagModule, 'listTags').mockResolvedValue([
      { env: 'production', tags: ['stable', 'v2'] },
      { env: 'staging', tags: [] },
    ]);
    const program = makeProgram();
    await program.parseAsync(['node', 'test', 'tag', 'list']);
    expect(consoleLogSpy).toHaveBeenCalledWith('production: stable, v2');
    expect(consoleLogSpy).toHaveBeenCalledWith('staging: (none)');
  });

  it('tag list prints no tags found when empty', async () => {
    jest.spyOn(tagModule, 'listTags').mockResolvedValue([]);
    const program = makeProgram();
    await program.parseAsync(['node', 'test', 'tag', 'list']);
    expect(consoleLogSpy).toHaveBeenCalledWith('No tags found.');
  });
});
