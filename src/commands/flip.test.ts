import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach } from 'vitest';
import { flip } from './flip';
import { createDefaultConfig, writeConfig } from '../config/project';
import { writeKeys } from '../crypto/keyfile';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { generatePassphrase } from '../crypto/keyfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-flip-'));
}

describe('flip', () => {
  let projectDir: string;
  const projectName = 'flip-test';
  const envA = 'staging';
  const envB = 'production';
  let keyA: string;
  let keyB: string;

  beforeEach(async () => {
    projectDir = makeTempDir();
    keyA = generatePassphrase();
    keyB = generatePassphrase();

    const config = createDefaultConfig(projectName);
    config.environments = [envA, envB];
    writeConfig(projectDir, config);

    writeKeys({
      [`${projectName}:${envA}`]: keyA,
      [`${projectName}:${envB}`]: keyB,
    });

    await encryptEnvFile('API_URL=https://staging.example.com\nDEBUG=true\n', getEncryptedPath(projectDir, envA), keyA);
    await encryptEnvFile('API_URL=https://prod.example.com\nDEBUG=false\n', getEncryptedPath(projectDir, envB), keyB);
  });

  it('swaps the contents of two environments', async () => {
    const result = await flip(projectDir, envA, envB);
    expect(result.from).toBe(envA);
    expect(result.to).toBe(envB);
  });

  it('throws if project does not exist', async () => {
    await expect(flip('/nonexistent', envA, envB)).rejects.toThrow('No envault project found');
  });

  it('throws if fromEnv does not exist in config', async () => {
    await expect(flip(projectDir, 'ghost', envB)).rejects.toThrow('Environment "ghost" does not exist');
  });

  it('throws if toEnv does not exist in config', async () => {
    await expect(flip(projectDir, envA, 'ghost')).rejects.toThrow('Environment "ghost" does not exist');
  });

  it('throws if source and target are the same', async () => {
    await expect(flip(projectDir, envA, envA)).rejects.toThrow('must be different');
  });

  it('throws if encrypted file for fromEnv is missing', async () => {
    fs.unlinkSync(getEncryptedPath(projectDir, envA));
    await expect(flip(projectDir, envA, envB)).rejects.toThrow(`Encrypted file for "${envA}" not found`);
  });
});
