import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { registerStatusCommand } from './status-command';
import * as statusModule from '../commands/status';

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerStatusCommand(program);
  return program;
}

describe('registerStatusCommand', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('registers the status command', () => {
    const program = makeProgram();
    const cmd = program.commands.find((c) => c.name() === 'status');
    expect(cmd).toBeDefined();
    expect(cmd?.description()).toBe('Show the status of all environments in the current project');
  });

  it('prints not initialized message when project is not set up', async () => {
    vi.spyOn(statusModule, 'statusCommand').mockResolvedValue({
      initialized: false,
      environments: [],
    });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    const program = makeProgram();
    await program.parseAsync(['status'], { from: 'user' });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('not initialized'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('prints environment table when initialized', async () => {
    vi.spyOn(statusModule, 'statusCommand').mockResolvedValue({
      initialized: true,
      environments: [
        { name: 'development', hasKey: true, isLocked: false, envFileExists: true, encryptedFileExists: true },
        { name: 'production', hasKey: false, isLocked: true, envFileExists: false, encryptedFileExists: true },
      ],
    });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const program = makeProgram();
    await program.parseAsync(['status'], { from: 'user' });

    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('development');
    expect(output).toContain('production');
  });
});
