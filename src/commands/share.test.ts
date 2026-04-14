import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { share, importShare } from './share';
import { createDefaultConfig, writeConfig } from '../config/project';
import { storeKey, readKeys } from '../crypto/keyfile';
import { getEncryptedPath } from '../crypto/envfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-share-'));
}

describe('share', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig('test-project');
    config.environments = ['production'];
    writeConfig(tmpDir, config);

    // Create a fake locked file
    const encPath = getEncryptedPath(tmpDir, 'production');
    fs.mkdirSync(path.dirname(encPath), { recursive: true });
    fs.writeFileSync(encPath, 'encrypted-content', 'utf-8');

    storeKey(tmpDir, 'production', 'super-secret-passphrase');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates a share bundle file for a valid environment', async () => {
    const result = await share({ projectDir: tmpDir, environment: 'production', recipient: 'alice' });

    expect(result.environment).toBe('production');
    expect(result.recipient).toBe('alice');
    expect(fs.existsSync(result.exportedKeyFile)).toBe(true);

    const bundle = JSON.parse(fs.readFileSync(result.exportedKeyFile, 'utf-8'));
    expect(bundle.passphrase).toBe('super-secret-passphrase');
    expect(bundle.project).toBe('test-project');
    expect(bundle.recipient).toBe('alice');
  });

  it('throws if environment does not exist in config', async () => {
    await expect(share({ projectDir: tmpDir, environment: 'staging', recipient: 'bob' }))
      .rejects.toThrow('Environment "staging" does not exist');
  });

  it('throws if no locked file exists for the environment', async () => {
    const config = createDefaultConfig('test-project');
    config.environments = ['staging'];
    writeConfig(tmpDir, config);
    storeKey(tmpDir, 'staging', 'another-passphrase');

    await expect(share({ projectDir: tmpDir, environment: 'staging', recipient: 'bob' }))
      .rejects.toThrow('No locked file found');
  });

  it('imports a share bundle and stores the key', async () => {
    const { exportedKeyFile } = await share({ projectDir: tmpDir, environment: 'production', recipient: 'alice' });

    const newDir = makeTempDir();
    try {
      const config = createDefaultConfig('test-project');
      config.environments = ['production'];
      writeConfig(newDir, config);

      const result = await importShare({ projectDir: newDir, shareFile: exportedKeyFile });
      expect(result.environment).toBe('production');

      const keys = readKeys(newDir);
      expect(keys['production']).toBe('super-secret-passphrase');
    } finally {
      fs.rmSync(newDir, { recursive: true, force: true });
    }
  });

  it('throws when importing a share bundle for a different project', async () => {
    const { exportedKeyFile } = await share({ projectDir: tmpDir, environment: 'production', recipient: 'alice' });

    const newDir = makeTempDir();
    try {
      const config = createDefaultConfig('other-project');
      config.environments = ['production'];
      writeConfig(newDir, config);

      await expect(importShare({ projectDir: newDir, shareFile: exportedKeyFile }))
        .rejects.toThrow('Share bundle is for project');
    } finally {
      fs.rmSync(newDir, { recursive: true, force: true });
    }
  });
});
