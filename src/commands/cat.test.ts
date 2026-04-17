import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach } from 'vitest';
import { cat } from './cat';
import { createDefaultConfig, writeConfig } from '../config/project';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { writeKeys } from '../crypto/keyfile';
import { generatePassphrase } from '../crypto/keyfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-cat-'));
}

describe('cat', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  it('throws if no config exists', async () => {
    await expect(cat({ environment: 'development', projectDir: tmpDir })).rejects.toThrow('No envault project found');
  });

  it('throws if environment does not exist', async () => {
    const config = createDefaultConfig('myapp');
    writeConfig(tmpDir, config);
    await expect(cat({ environment: 'staging', projectDir: tmpDir })).rejects.toThrow('does not exist');
  });

  it('throws if no encrypted file found', async () => {
    const config = createDefaultConfig('myapp');
    config.environments = ['development'];
    writeConfig(tmpDir, config);
    await expect(cat({ environment: 'development', projectDir: tmpDir })).rejects.toThrow('No encrypted file found');
  });

  it('throws if no key found', async () => {
    const config = createDefaultConfig('myapp');
    config.environments = ['development'];
    writeConfig(tmpDir, config);
    const encPath = getEncryptedPath(tmpDir, 'development');
    fs.writeFileSync(encPath, 'dummy');
    writeKeys({});
    await expect(cat({ environment: 'development', projectDir: tmpDir })).rejects.toThrow('No key found');
  });

  it('returns decrypted contents', async () => {
    const config = createDefaultConfig('myapp');
    config.environments = ['development'];
    writeConfig(tmpDir, config);

    const passphrase = generatePassphrase();
    const envContent = 'API_KEY=secret\nDEBUG=true\n';
    const srcFile = path.join(tmpDir, '.env.development');
    fs.writeFileSync(srcFile, envContent);

    encryptEnvFile(srcFile, getEncryptedPath(tmpDir, 'development'), passphrase);
    writeKeys({ myapp: { development: passphrase } });

    const result = await cat({ environment: 'development', projectDir: tmpDir });
    expect(result).toBe(envContent);
  });
});
