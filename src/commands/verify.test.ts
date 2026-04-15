import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { verify } from './verify';
import { createDefaultConfig, writeConfig } from '../config/project';
import { writeKeys } from '../crypto/keyfile';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-verify-'));
}

describe('verify', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig('test-project');
    config.environments = ['development', 'production'];
    writeConfig(tmpDir, config);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should report missing encrypted file and key', async () => {
    const results = await verify(tmpDir, 'development');
    expect(results).toHaveLength(1);
    expect(results[0].encryptedFileExists).toBe(false);
    expect(results[0].keyExists).toBe(false);
    expect(results[0].decryptable).toBe(false);
  });

  it('should report key missing when only encrypted file exists', async () => {
    const encPath = getEncryptedPath(tmpDir, 'development');
    fs.writeFileSync(encPath, 'dummy-encrypted-data');
    const results = await verify(tmpDir, 'development');
    expect(results[0].encryptedFileExists).toBe(true);
    expect(results[0].keyExists).toBe(false);
    expect(results[0].decryptable).toBe(false);
  });

  it('should verify all environments when none specified', async () => {
    const results = await verify(tmpDir);
    expect(results).toHaveLength(2);
    expect(results.map(r => r.environment)).toEqual(['development', 'production']);
  });

  it('should throw when config does not exist', async () => {
    await expect(verify('/nonexistent/path')).rejects.toThrow('No envault config found');
  });

  it('should report decryptable true for valid encrypted env', async () => {
    const passphrase = 'test-passphrase-32-chars-long!!!!';
    const envContent = 'API_KEY=secret\nDB_URL=postgres://localhost/db';
    fs.writeFileSync(path.join(tmpDir, '.env.development'), envContent);
    await encryptEnvFile(tmpDir, 'development', passphrase);
    writeKeys({ 'test-project:development': { passphrase, createdAt: new Date().toISOString() } });
    const results = await verify(tmpDir, 'development');
    expect(results[0].encryptedFileExists).toBe(true);
    expect(results[0].keyExists).toBe(true);
    expect(results[0].decryptable).toBe(true);
  });
});
