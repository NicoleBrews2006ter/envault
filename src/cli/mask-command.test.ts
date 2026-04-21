import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import { registerMaskCommand } from './mask-command';
import { createDefaultConfig, writeConfig } from '../config/project';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { storeKey, generatePassphrase } from '../crypto/keyfile';

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerMaskCommand(program);
  return program;
}

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-mask-cli-'));
}

describe('mask-command CLI', () => {
  let tmpDir: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = makeTempDir();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('prints error when project not initialized', async () => {
    const program = makeProgram();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    await expect(
      program.parseAsync(['node', 'envault', 'mask', 'production', '--dir', tmpDir])
    ).rejects.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Error:'));
    exitSpy.mockRestore();
  });

  it('masks and prints env file contents', async () => {
    const passphrase = generatePassphrase();
    const config = createDefaultConfig('mask-cli-proj');
    config.environments = ['staging'];
    writeConfig(tmpDir, config);
    storeKey('mask-cli-proj', passphrase);
    const envPath = path.join(tmpDir, '.env.staging');
    fs.writeFileSync(envPath, 'SECRET=abc123\n# a comment');
    const encPath = getEncryptedPath(tmpDir, 'staging');
    await encryptEnvFile(envPath, encPath, passphrase);
    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'mask', 'staging', '--dir', tmpDir]);
    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('staging');
    expect(output).toContain('SECRET=');
    expect(output).not.toContain('abc123');
  });

  it('rejects invalid --reveal value', async () => {
    const program = makeProgram();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    await expect(
      program.parseAsync(['node', 'envault', 'mask', 'staging', '--reveal', 'bad', '--dir', tmpDir])
    ).rejects.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('--reveal'));
    exitSpy.mockRestore();
  });
});
