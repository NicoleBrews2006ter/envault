import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exportEnv } from './export';
import { createDefaultConfig, writeConfig } from '../config/project';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { storeKey } from '../crypto/keyfile';
import { generatePassphrase } from '../crypto/keyfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-export-test-'));
}

describe('exportEnv', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('throws if no config exists', async () => {
    await expect(
      exportEnv({ environment: 'development', projectDir: tmpDir })
    ).rejects.toThrow('No envault project found');
  });

  it('throws if environment is not in config', async () => {
    const config = createDefaultConfig('test-project');
    writeConfig(tmpDir, config);

    await expect(
      exportEnv({ environment: 'staging', projectDir: tmpDir })
    ).rejects.toThrow('Environment "staging" not found');
  });

  it('throws if no encrypted file exists', async () => {
    const config = createDefaultConfig('test-project');
    writeConfig(tmpDir, config);

    await expect(
      exportEnv({ environment: 'development', projectDir: tmpDir })
    ).rejects.toThrow('No encrypted file found');
  });

  it('exports decrypted env to output path', async () => {
    const config = createDefaultConfig('test-project');
    writeConfig(tmpDir, config);

    const passphrase = generatePassphrase();
    const envContent = 'API_KEY=secret\nDB_URL=postgres://localhost/db\n';
    const envPath = path.join(tmpDir, '.env.development');
    fs.writeFileSync(envPath, envContent, 'utf-8');

    await encryptEnvFile(envPath, passphrase);
    storeKey('test-project', 'development', passphrase);

    const outputPath = path.join(tmpDir, 'exported.env');
    const result = await exportEnv({
      environment: 'development',
      output: outputPath,
      projectDir: tmpDir,
    });

    expect(result).toBe(outputPath);
    expect(fs.existsSync(outputPath)).toBe(true);
    const exported = fs.readFileSync(outputPath, 'utf-8');
    expect(exported).toContain('API_KEY=secret');
  });
});
