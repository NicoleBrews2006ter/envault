import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { registerRollbackCommand } from './rollback-command';

vi.mock('../commands/rollback', () => ({
  rollback: vi.fn(),
}));

import { rollback } from '../commands/rollback';

function makeProgram() {
  const program = new Command();
  program.exitOverride();
  registerRollbackCommand(program);
  return program;
}

describe('rollback-command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls rollback with environment', async () => {
    vi.mocked(rollback).mockResolvedValue({
      environment: 'production',
      snapshotId: '2024-01-01T00-00-00',
      restoredAt: '2024-01-03T00:00:00.000Z',
    });

    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'rollback', 'production']);

    expect(rollback).toHaveBeenCalledWith('production', {
      projectDir: undefined,
      snapshotId: undefined,
    });
  });

  it('passes snapshot id option when provided', async () => {
    vi.mocked(rollback).mockResolvedValue({
      environment: 'staging',
      snapshotId: '2024-01-01T00-00-00',
      restoredAt: '2024-01-03T00:00:00.000Z',
    });

    const program = makeProgram();
    await program.parseAsync([
      'node', 'envault', 'rollback', 'staging', '--snapshot', '2024-01-01T00-00-00',
    ]);

    expect(rollback).toHaveBeenCalledWith('staging', {
      projectDir: undefined,
      snapshotId: '2024-01-01T00-00-00',
    });
  });

  it('exits with code 1 on error', async () => {
    vi.mocked(rollback).mockRejectedValue(new Error('No snapshots found'));
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'rollback', 'production']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('No snapshots found'));

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
