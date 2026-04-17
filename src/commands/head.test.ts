import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { head } from './head';
import { createDefaultConfig, writeConfig } from '../config/project';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { generatePassphrase } from '../crypto/keyfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-head-'));
}

describe('head', () => {
  it('throws if project not initialized', async () => {
    const dir = makeTempDir();
    await expect(head(dir, 'development')).rejects.toThrow('No envault project found');
  });

  it('throws if environment does not exist', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig();
    writeConfig(dir, config);
    await expect(head(dir, 'staging')).rejects.toThrow('does not exist');
  });

  it('returns first N lines of encrypted file content', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig();
    config.environments = ['development'];
    writeConfig(dir, config);

    const passphrase = generatePassphrase();
    const envContent = Array.from({ length: 20 }, (_, i) => `KEY_${i}=value${i}`).join('\n');
    const encryptedPath = getEncryptedPath(dir, 'development');
    await encryptEnvFile(envContent, encryptedPath, passphrase);

    const result = await head(dir, 'development', { decrypt: true, lines: 5 });
    expect(result.length).toBe(5);
    expect(result[0]).toBe('KEY_0=value0');
  });

  it('defaults to 10 lines', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig();
    config.environments = ['development'];
    writeConfig(dir, config);

    const passphrase = generatePassphrase();
    const envContent = Array.from({ length: 20 }, (_, i) => `KEY_${i}=value${i}`).join('\n');
    const encryptedPath = getEncryptedPath(dir, 'development');
    await encryptEnvFile(envContent, encryptedPath, passphrase);

    const result = await head(dir, 'development', { decrypt: true });
    expect(result.length).toBe(10);
  });
});
