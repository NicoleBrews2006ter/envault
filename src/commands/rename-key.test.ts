import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach } from 'bun:test';
import { renameKey } from './rename-key';
import { createDefaultConfig, writeConfig } from '../config/project';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { storeKey } from '../crypto/keyfile';
import { generatePassphrase } from '../crypto/keyfile';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-rename-key-'));
}

describe('renameKey', () => {
  let tmpDir: string;
  let passphrase: string;

  beforeEach(async () => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig('test-project');
    config.environments = ['development'];
    writeConfig(tmpDir, config);
    passphrase = generatePassphrase();
    storeKey('test-project', 'development', passphrase);
    const encPath = getEncryptedPath(tmpDir, 'development');
    await encryptEnvFile('API_KEY=secret\nDB_URL=postgres://localhost/db\n', encPath, passphrase);
  });

  it('renames an existing key', async () => {
    await expect(renameKey('development', 'API_KEY', 'API_SECRET', tmpDir)).resolves.toBeUndefined();
  });

  it('throws if environment does not exist', async () => {
    await expect(renameKey('production', 'API_KEY', 'NEW_KEY', tmpDir)).rejects.toThrow(
      'Environment "production" does not exist.'
    );
  });

  it('throws if key not found', async () => {
    await expect(renameKey('development', 'MISSING_KEY', 'NEW_KEY', tmpDir)).rejects.toThrow(
      'Key "MISSING_KEY" not found'
    );
  });

  it('throws if project not initialized', async () => {
    const emptyDir = makeTempDir();
    await expect(renameKey('development', 'API_KEY', 'NEW_KEY', emptyDir)).rejects.toThrow(
      'No envault project found'
    );
  });
});
