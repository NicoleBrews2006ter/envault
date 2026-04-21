import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach } from 'vitest';
import { Command } from 'commander';
import { registerRedactCommand } from './redact-command';
import { createDefaultConfig, writeConfig } from '../config/project';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { writeKeys, generatePassphrase } from '../crypto/keyfile';

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerRedactCommand(program);
  return program;
}

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-redact-cli-'));
}

describe('redact-command CLI', () => {
  let tmpDir: string;
  let passphrase: string;

  beforeEach(async () => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig();
    config.environments = ['staging'];
    writeConfig(tmpDir, config);

    passphrase = generatePassphrase();
    writeKeys(tmpDir, { staging: passphrase });

    const envContent = 'SECRET=abc123\nPUBLIC=hello\n';
    const encPath = getEncryptedPath(tmpDir, 'staging');
    await encryptEnvFile(envContent, encPath, passphrase);
  });

  it('writes redacted output to stdout', async () => {
    const program = makeProgram();
    const chunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: unknown) => { chunks.push(String(chunk)); return true; };

    try {
      await program.parseAsync(['redact', 'staging', 'SECRET', '--dir', tmpDir], { from: 'user' });
    } finally {
      process.stdout.write = origWrite;
    }

    const output = chunks.join('');
    expect(output).toContain('SECRET=***REDACTED***');
    expect(output).toContain('PUBLIC=hello');
  });

  it('respects custom --placeholder option', async () => {
    const program = makeProgram();
    const chunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = (chunk: unknown) => { chunks.push(String(chunk)); return true; };

    try {
      await program.parseAsync(
        ['redact', 'staging', 'SECRET', '--placeholder', '[CENSORED]', '--dir', tmpDir],
        { from: 'user' }
      );
    } finally {
      process.stdout.write = origWrite;
    }

    expect(chunks.join('')).toContain('SECRET=[CENSORED]');
  });
});
