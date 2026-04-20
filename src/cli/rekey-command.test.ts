import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import { registerRekeyCommand } from './rekey-command';
import * as rekeyModule from '../commands/rekey';

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerRekeyCommand(program);
  return program;
}

describe('rekey-command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call rekey with the correct environment', async () => {
    const mockResult = {
      environment: 'staging',
      oldFingerprint: 'abc12345',
      newFingerprint: 'xyz67890',
      encryptedPath: '/tmp/project/.envault/staging.enc',
    };
    const rekaySpy = vi.spyOn(rekeyModule, 'rekey').mockResolvedValue(mockResult);

    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'rekey', 'staging']);

    expect(rekaySpy).toHaveBeenCalledWith({
      environment: 'staging',
      projectDir: undefined,
      newPassphrase: undefined,
    });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('staging'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('abc12345'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('xyz67890'));
  });

  it('should pass custom passphrase when provided', async () => {
    const rekaySpy = vi.spyOn(rekeyModule, 'rekey').mockResolvedValue({
      environment: 'production',
      oldFingerprint: 'old00000',
      newFingerprint: 'new11111',
      encryptedPath: '/tmp/project/.envault/production.enc',
    });

    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'rekey', 'production', '--passphrase', 'mysecret']);

    expect(rekaySpy).toHaveBeenCalledWith(
      expect.objectContaining({ newPassphrase: 'mysecret' })
    );
  });

  it('should print error and exit on failure', async () => {
    vi.spyOn(rekeyModule, 'rekey').mockRejectedValue(new Error('no key found'));

    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'rekey', 'missing']);

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('no key found'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
