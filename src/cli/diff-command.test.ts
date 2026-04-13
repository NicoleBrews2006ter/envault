import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { registerDiffCommand } from './diff-command';
import { diffCommand } from '../commands/diff';

vi.mock('../commands/diff');

function makeProgram() {
  const program = new Command();
  program.exitOverride();
  registerDiffCommand(program);
  return program;
}

describe('registerDiffCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers the diff command', () => {
    const program = makeProgram();
    const cmd = program.commands.find(c => c.name() === 'diff');
    expect(cmd).toBeDefined();
  });

  it('calls diffCommand with environment and no file option', async () => {
    vi.mocked(diffCommand).mockResolvedValue({
      environment: 'staging',
      onlyInEncrypted: [],
      onlyInPlaintext: [],
      changed: [],
      unchanged: 3,
    });
    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'diff', 'staging']);
    expect(diffCommand).toHaveBeenCalledWith('staging', undefined);
  });

  it('calls diffCommand with custom file path', async () => {
    vi.mocked(diffCommand).mockResolvedValue({
      environment: 'production',
      onlyInEncrypted: ['OLD_KEY'],
      onlyInPlaintext: ['NEW_KEY'],
      changed: ['DB_URL'],
      unchanged: 1,
    });
    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'diff', 'production', '--file', '.env.local']);
    expect(diffCommand).toHaveBeenCalledWith('production', '.env.local');
  });

  it('exits with code 1 on error', async () => {
    vi.mocked(diffCommand).mockRejectedValue(new Error('No envault config found'));
    const program = makeProgram();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
    await expect(
      program.parseAsync(['node', 'envault', 'diff', 'staging'])
    ).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
