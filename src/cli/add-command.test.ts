import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { registerAddCommand } from './add-command';

vi.mock('../commands/add', () => ({
  addEnvFile: vi.fn().mockResolvedValue(undefined),
}));

describe('registerAddCommand', () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    program.exitOverride();
    registerAddCommand(program);
  });

  it('registers the add command', () => {
    const cmd = program.commands.find((c) => c.name() === 'add');
    expect(cmd).toBeDefined();
  });

  it('calls addEnvFile with default .env when no argument given', async () => {
    const { addEnvFile } = await import('../commands/add');
    await program.parseAsync(['node', 'envault', 'add']);
    expect(addEnvFile).toHaveBeenCalledWith(
      expect.objectContaining({ env: '.env' })
    );
  });

  it('calls addEnvFile with provided env filename', async () => {
    const { addEnvFile } = await import('../commands/add');
    await program.parseAsync(['node', 'envault', 'add', '.env.production']);
    expect(addEnvFile).toHaveBeenCalledWith(
      expect.objectContaining({ env: '.env.production' })
    );
  });

  it('passes --dir option to addEnvFile', async () => {
    const { addEnvFile } = await import('../commands/add');
    await program.parseAsync(['node', 'envault', 'add', '--dir', '/some/path']);
    expect(addEnvFile).toHaveBeenCalledWith(
      expect.objectContaining({ projectDir: '/some/path' })
    );
  });
});
