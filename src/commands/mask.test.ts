import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { maskValue, maskEnvContents, mask } from './mask';
import { createDefaultConfig, writeConfig } from '../config/project';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { storeKey, generatePassphrase } from '../crypto/keyfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-mask-'));
}

describe('maskValue', () => {
  it('returns fixed asterisks for short values', () => {
    expect(maskValue('abc')).toBe('***');
  });

  it('masks full value when reveal is 0', () => {
    const result = maskValue('supersecret');
    expect(result).toMatch(/^\*+$/);
  });

  it('reveals last N characters', () => {
    const result = maskValue('supersecret', 3);
    expect(result.endsWith('ret')).toBe(true);
    expect(result).toContain('*');
  });

  it('returns empty string for empty value', () => {
    expect(maskValue('')).toBe('');
  });
});

describe('maskEnvContents', () => {
  it('masks values in env lines', () => {
    const lines = maskEnvContents('KEY=value\nOTHER=secret');
    expect(lines[0]).toMatch(/^KEY=\*+$/);
    expect(lines[1]).toMatch(/^OTHER=\*+$/);
  });

  it('preserves comment lines', () => {
    const lines = maskEnvContents('# comment\nKEY=val');
    expect(lines[0]).toBe('# comment');
  });

  it('preserves empty lines', () => {
    const lines = maskEnvContents('KEY=val\n\nOTHER=x');
    expect(lines[1]).toBe('');
  });
});

describe('mask command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('throws if no config exists', async () => {
    await expect(mask(tmpDir, 'production')).rejects.toThrow('No envault project found');
  });

  it('throws if environment does not exist', async () => {
    const config = createDefaultConfig('test-proj');
    writeConfig(tmpDir, config);
    await expect(mask(tmpDir, 'staging')).rejects.toThrow('does not exist');
  });

  it('masks env file contents', async () => {
    const passphrase = generatePassphrase();
    const config = createDefaultConfig('mask-proj');
    config.environments = ['development'];
    writeConfig(tmpDir, config);
    storeKey('mask-proj', passphrase);
    const envPath = path.join(tmpDir, '.env.development');
    fs.writeFileSync(envPath, 'API_KEY=topsecret\nDB_PASS=hunter2');
    const encPath = getEncryptedPath(tmpDir, 'development');
    await encryptEnvFile(envPath, encPath, passphrase);
    const result = await mask(tmpDir, 'development');
    expect(result.maskedCount).toBe(2);
    expect(result.lines.some((l) => l.includes('topsecret'))).toBe(false);
    expect(result.lines.some((l) => l.startsWith('API_KEY='))).toBe(true);
  });
});
