import { Command } from 'commander';
import { registerInjectCommand } from './inject-command';
import * as injectModule from '../commands/inject';

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerInjectCommand(program);
  return program;
}

describe('registerInjectCommand', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers the inject command', () => {
    const program = makeProgram();
    const cmd = program.commands.find((c) => c.name() === 'inject');
    expect(cmd).toBeDefined();
  });

  it('calls inject with correct arguments', async () => {
    const mockInject = jest
      .spyOn(injectModule, 'inject')
      .mockResolvedValue({ environment: 'production', injected: 5, command: 'node server.js' });

    // Simulate argv so the '--' separator logic works
    const originalArgv = process.argv;
    process.argv = ['node', 'envault', 'inject', 'production', '--', 'node', 'server.js'];

    const program = makeProgram();
    await program.parseAsync(['inject', 'production', '--', 'node', 'server.js'], { from: 'user' });

    expect(mockInject).toHaveBeenCalledWith(
      expect.any(String),
      'production',
      ['node', 'server.js']
    );

    process.argv = originalArgv;
  });

  it('exits with code 1 when inject throws', async () => {
    jest.spyOn(injectModule, 'inject').mockRejectedValue(new Error('No envault project found'));
    const originalArgv = process.argv;
    process.argv = ['node', 'envault', 'inject', 'development', '--', 'echo', 'hi'];

    const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as any);

    const program = makeProgram();
    await expect(
      program.parseAsync(['inject', 'development', '--', 'echo', 'hi'], { from: 'user' })
    ).rejects.toThrow();

    expect(mockExit).toHaveBeenCalledWith(1);
    process.argv = originalArgv;
  });
});
