import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { count } from './count';
import { createDefaultConfig, writeConfig } from '../config/project';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { writeKeys } from '../crypto/keyfile';
import { generatePassphrase } from '../crypto/keyfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-count-'));
}

describe('count', () => {
  let tmpDir: string;
  const projectId = 'count-test-project';
  const environment = 'production';
  let passphrase: string;

  beforeEach(async () => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig(projectId);
    config.environments = [environment];
    writeConfig(tmpDir, config);

    passphrase = generatePassphrase();
    writeKeys({ [projectId]: { [environment]: passphrase } });

    const envContents = [
      '# Database settings',
      'DB_HOST=localhost',
      'DB_PORT=5432',
      '',
      '# App settings',
      'APP_SECRET=supersecret',
      'DEBUG=false',
      '',
    ].join('\n');

    const encryptedPath = getEncryptedPath(tmpDir, environment);
    await encryptEnvFile(envContents, encryptedPath, passphrase);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns correct counts for env file', async () => {
    const result = await count(tmpDir, environment);
    expect(result.environment).toBe(environment);
    expect(result.active).toBe(4);
    expect(result.commented).toBe(2);
    expect(result.empty).toBe(2);
    expect(result.total).toBe(8);
  });

  it('throws if project not initialized', async () => {
    const emptyDir = makeTempDir();
    await expect(count(emptyDir, environment)).rejects.toThrow('No envault project found');
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });

  it('throws if environment does not exist', async () => {
    await expect(count(tmpDir, 'staging')).rejects.toThrow('Environment "staging" does not exist');
  });

  it('throws if no key found for environment', async () => {
    writeKeys({});
    await expect(count(tmpDir, environment)).rejects.toThrow('No key found');
  });
});
