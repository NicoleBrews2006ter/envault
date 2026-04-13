import { Command } from 'commander';
import { registerInfoCommand } from './info-command';
import * as infoModule from '../commands/info';

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerInfoCommand(program);
  return program;
}

describe('registerInfoCommand', () => {
  let consoleSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers the info command', () => {
    const program = makeProgram();
    const cmd = program.commands.find((c) => c.name() === 'info');
    expect(cmd).toBeDefined();
  });

  it('displays project info without environment detail', async () => {
    jest.spyOn(infoModule, 'runInfo').mockResolvedValue({
      projectName: 'my-app',
      configPath: '/tmp/my-app/.envault/config.json',
      environments: ['development', 'production'],
      activeEnvironment: 'development',
      environmentDetail: null,
    });

    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'info']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('my-app'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('development, production'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('development'));
  });

  it('displays environment detail when --env flag is provided', async () => {
    jest.spyOn(infoModule, 'runInfo').mockResolvedValue({
      projectName: 'my-app',
      configPath: '/tmp/my-app/.envault/config.json',
      environments: ['production'],
      activeEnvironment: null,
      environmentDetail: {
        name: 'production',
        encryptedPath: '/tmp/my-app/.envault/production.env.enc',
        fileExists: true,
        keyStored: true,
        variableCount: 5,
      },
    });

    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'info', '--env', 'production']);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('production'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('5'));
  });

  it('prints error and exits on failure', async () => {
    jest.spyOn(infoModule, 'runInfo').mockRejectedValue(new Error('config not found'));

    const program = makeProgram();
    await expect(program.parseAsync(['node', 'envault', 'info'])).rejects.toThrow('process.exit');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('config not found'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
