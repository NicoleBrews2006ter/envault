import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { unique } from './unique';
import { createDefaultConfig, writeConfig } from '../config/project';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { writeKeys } from '../crypto/keyfile';
import { generatePassphrase } from '../crypto/keyfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-unique-'));
}

describe('unique', () => {
  it('throws if project not initialized', async () => {
    const dir = makeTempDir();
    await expect(unique(dir, 'development')).rejects.toThrow('No envault project found');
  });

  it('throws if environment does not exist', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig();
    writeConfig(dir, config);
    await expect(unique(dir, 'staging')).rejects.toThrow('does not exist');
  });

  it('throws if no encrypted file found', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig();
    writeConfig(dir, config);
    const passphrase = generatePassphrase();
    writeKeys(dir, { development: passphrase });
    await expect(unique(dir, 'development')).rejects.toThrow('No encrypted file found');
  });

  it('returns empty duplicates for unique keys', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig();
    writeConfig(dir, config);
    const passphrase = generatePassphrase();
    writeKeys(dir, { development: passphrase });
    const contents = 'API_KEY=abc\nDB_HOST=localhost\nSECRET=xyz\n';
    const encPath = getEncryptedPath(dir, 'development');
    await encryptEnvFile(contents, encPath, passphrase);
    const result = await unique(dir, 'development');
    expect(result.duplicateKeys).toHaveLength(0);
    expect(result.totalKeys).toBe(3);
  });

  it('detects duplicate keys', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig();
    writeConfig(dir, config);
    const passphrase = generatePassphrase();
    writeKeys(dir, { development: passphrase });
    const contents = 'API_KEY=abc\nDB_HOST=localhost\nAPI_KEY=duplicate\nSECRET=xyz\n';
    const encPath = getEncryptedPath(dir, 'development');
    await encryptEnvFile(contents, encPath, passphrase);
    const result = await unique(dir, 'development');
    expect(result.duplicateKeys).toContain('API_KEY');
    expect(result.duplicateKeys).toHaveLength(1);
    expect(result.totalKeys).toBe(3);
  });

  it('ignores comment lines', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig();
    writeConfig(dir, config);
    const passphrase = generatePassphrase();
    writeKeys(dir, { development: passphrase });
    const contents = '# This is a comment\nAPI_KEY=abc\n# Another comment\nDB_HOST=localhost\n';
    const encPath = getEncryptedPath(dir, 'development');
    await encryptEnvFile(contents, encPath, passphrase);
    const result = await unique(dir, 'development');
    expect(result.duplicateKeys).toHaveLength(0);
    expect(result.totalKeys).toBe(2);
  });
});
