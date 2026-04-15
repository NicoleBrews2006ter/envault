import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetch } from './fetch';
import { createDefaultConfig, writeConfig } from '../config/project';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { storeKey, readKeys } from '../crypto/keyfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-fetch-'));
}

vi.mock('../crypto/keyfile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../crypto/keyfile')>();
  const store: Record<string, { passphrase: string }> = {};
  return {
    ...actual,
    readKeys: vi.fn(async () => store),
    storeKey: vi.fn(async (project: string, env: string, passphrase: string) => {
      store[`${project}:${env}`] = { passphrase };
    }),
    ensureEnvaultDir: vi.fn(async () => {}),
  };
});

describe('fetch', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig('test-project');
    config.environments = { staging: {} };
    await writeConfig(tmpDir, config);
    await storeKey('test-project', 'staging', 'secret-passphrase');
    const envContent = 'API_KEY=abc123\nDB_HOST=localhost\n';
    const envPath = path.join(tmpDir, '.env.staging.tmp');
    fs.writeFileSync(envPath, envContent);
    const encPath = getEncryptedPath(tmpDir, 'staging');
    await encryptEnvFile(envPath, encPath, 'secret-passphrase');
    fs.unlinkSync(envPath);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('decrypts an environment file successfully', async () => {
    const results = await fetch(tmpDir, ['staging']);
    expect(results).toHaveLength(1);
    expect(results[0].skipped).toBe(false);
    expect(fs.existsSync(results[0].outputPath)).toBe(true);
  });

  it('skips if output file already exists without --force', async () => {
    const outputPath = path.join(tmpDir, '.env.staging');
    fs.writeFileSync(outputPath, 'existing=content');
    const results = await fetch(tmpDir, ['staging']);
    expect(results[0].skipped).toBe(true);
    expect(results[0].reason).toContain('already exists');
  });

  it('overwrites existing file with --force', async () => {
    const outputPath = path.join(tmpDir, '.env.staging');
    fs.writeFileSync(outputPath, 'old=data');
    const results = await fetch(tmpDir, ['staging'], { force: true });
    expect(results[0].skipped).toBe(false);
    const content = fs.readFileSync(outputPath, 'utf-8');
    expect(content).toContain('API_KEY');
  });

  it('skips environment with no encrypted file', async () => {
    const results = await fetch(tmpDir, ['production']);
    expect(results[0].skipped).toBe(true);
    expect(results[0].reason).toContain('no encrypted file');
  });
});
