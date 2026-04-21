import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sortEnvContents, sort } from './sort';
import { createDefaultConfig, writeConfig } from '../config/project';
import { encryptEnvFile } from '../crypto/envfile';
import { storeKey } from '../crypto/keyfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-sort-'));
}

describe('sortEnvContents', () => {
  it('sorts keys ascending by default', () => {
    const input = 'ZEBRA=1\nAPPLE=2\nMIDDLE=3';
    const result = sortEnvContents(input, 'asc');
    expect(result).toBe('APPLE=2\nMIDDLE=3\nZEBRA=1');
  });

  it('sorts keys descending', () => {
    const input = 'APPLE=2\nZEBRA=1\nMIDDLE=3';
    const result = sortEnvContents(input, 'desc');
    expect(result).toBe('ZEBRA=1\nMIDDLE=3\nAPPLE=2');
  });

  it('preserves comment lines at top', () => {
    const input = '# My env\nZEBRA=1\nAPPLE=2';
    const result = sortEnvContents(input, 'asc');
    expect(result.startsWith('# My env')).toBe(true);
    expect(result).toContain('APPLE=2\nZEBRA=1');
  });

  it('handles empty input', () => {
    expect(sortEnvContents('', 'asc')).toBe('');
  });

  it('handles single entry', () => {
    expect(sortEnvContents('ONLY=value', 'asc')).toBe('ONLY=value');
  });
});

describe('sort command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig('test-sort-project');
    config.environments = ['production'];
    writeConfig(config, tmpDir);
    storeKey('test-sort-project', 'production', 'test-passphrase-sort');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('sorts an environment file in place', async () => {
    const contents = 'ZEBRA=1\nAPPLE=2\nMIDDLE=3';
    await encryptEnvFile(contents, 'production', 'test-passphrase-sort', tmpDir);

    const result = await sort('production', 'asc', tmpDir);
    expect(result.sorted).toBe(3);
    expect(result.environment).toBe('production');
  });

  it('throws if project not initialized', async () => {
    const emptyDir = makeTempDir();
    try {
      await expect(sort('production', 'asc', emptyDir)).rejects.toThrow('No envault project found');
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it('throws if environment does not exist', async () => {
    await expect(sort('staging', 'asc', tmpDir)).rejects.toThrow('Environment "staging" does not exist');
  });
});
