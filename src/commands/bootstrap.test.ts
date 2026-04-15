import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { bootstrap } from './bootstrap';
import { createDefaultConfig, writeConfig } from '../config/project';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import * as keyfile from '../crypto/keyfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-bootstrap-'));
}

describe('bootstrap', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('throws if no config exists', async () => {
    await expect(bootstrap(tmpDir)).rejects.toThrow('No envault project found');
  });

  it('throws if no environments configured', async () => {
    const config = createDefaultConfig('test-project');
    config.environments = {};
    writeConfig(tmpDir, config);
    await expect(bootstrap(tmpDir)).rejects.toThrow('No environments configured');
  });

  it('throws if environment not found', async () => {
    const config = createDefaultConfig('test-project');
    config.environments = { production: { createdAt: new Date().toISOString() } };
    writeConfig(tmpDir, config);
    vi.spyOn(keyfile, 'readKeys').mockReturnValue({});
    await expect(bootstrap(tmpDir, { environment: 'staging' })).rejects.toThrow(
      'Environment "staging" not found'
    );
  });

  it('throws if no key found for environment', async () => {
    const config = createDefaultConfig('test-project');
    config.environments = { development: { createdAt: new Date().toISOString() } };
    writeConfig(tmpDir, config);
    vi.spyOn(keyfile, 'readKeys').mockReturnValue({});
    await expect(bootstrap(tmpDir, { environment: 'development' })).rejects.toThrow(
      'No key found for environment "development"'
    );
  });

  it('skips writing if .env exists and force is false', async () => {
    const config = createDefaultConfig('test-project');
    config.environments = { development: { createdAt: new Date().toISOString() } };
    writeConfig(tmpDir, config);
    const passphrase = 'test-passphrase-32-chars-long!!!!';
    vi.spyOn(keyfile, 'readKeys').mockReturnValue({ [config.id]: { development: passphrase } });
    const envContent = 'API_KEY=abc123\nDEBUG=true\n';
    const envPath = path.join(tmpDir, '.env');
    fs.writeFileSync(envPath, envContent);
    const encPath = getEncryptedPath(tmpDir, 'development');
    await encryptEnvFile(envPath, encPath, passphrase);
    const result = await bootstrap(tmpDir, { environment: 'development' });
    expect(result.skipped).toBe(true);
  });

  it('decrypts env file to output path with force', async () => {
    const config = createDefaultConfig('test-project');
    config.environments = { development: { createdAt: new Date().toISOString() } };
    writeConfig(tmpDir, config);
    const passphrase = 'test-passphrase-32-chars-long!!!!';
    vi.spyOn(keyfile, 'readKeys').mockReturnValue({ [config.id]: { development: passphrase } });
    const envContent = 'API_KEY=abc123\nDEBUG=true\n';
    const srcEnv = path.join(tmpDir, '.env.src');
    fs.writeFileSync(srcEnv, envContent);
    const encPath = getEncryptedPath(tmpDir, 'development');
    await encryptEnvFile(srcEnv, encPath, passphrase);
    const outputPath = path.join(tmpDir, '.env.out');
    const result = await bootstrap(tmpDir, { environment: 'development', output: outputPath, force: true });
    expect(result.skipped).toBe(false);
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.readFileSync(outputPath, 'utf8')).toContain('API_KEY=abc123');
  });
});
