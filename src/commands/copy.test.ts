import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { copyEnvironment } from './copy';
import { createDefaultConfig, writeConfig } from '../config/project';
import { writeKeys } from '../crypto/keyfile';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { deriveKey } from '../crypto/encryption';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-copy-test-'));
}

const TEST_PROJECT_ID = 'test-project-copy';
const TEST_ENV_CONTENT = 'API_KEY=secret123\nDB_URL=postgres://localhost/test\n';

async function setupProject(dir: string) {
  const config = createDefaultConfig(TEST_PROJECT_ID);
  config.environments['staging'] = { createdAt: new Date().toISOString() };
  writeConfig(dir, config);

  const key = await deriveKey('test-passphrase', 'test-salt-1234567890123456');
  const encPath = getEncryptedPath(dir, 'staging');
  await encryptEnvFile(TEST_ENV_CONTENT, encPath, key);

  const keys: Record<string, Record<string, Buffer>> = {};
  keys[TEST_PROJECT_ID] = { staging: key };
  writeKeys(keys);

  return { config, key };
}

describe('copyEnvironment', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('copies an environment to a new name', async () => {
    await setupProject(tmpDir);
    await copyEnvironment('staging', 'production', { projectDir: tmpDir });

    const { readConfig } = await import('../config/project');
    const config = readConfig(tmpDir);
    expect(config.environments['production']).toBeDefined();

    const prodEncPath = getEncryptedPath(tmpDir, 'production');
    expect(fs.existsSync(prodEncPath)).toBe(true);
  });

  it('throws if source environment does not exist', async () => {
    await setupProject(tmpDir);
    await expect(
      copyEnvironment('nonexistent', 'production', { projectDir: tmpDir })
    ).rejects.toThrow('Source environment "nonexistent" does not exist.');
  });

  it('throws if target environment already exists', async () => {
    await setupProject(tmpDir);
    await expect(
      copyEnvironment('staging', 'staging', { projectDir: tmpDir })
    ).rejects.toThrow('already exists');
  });

  it('throws if project is not initialized', async () => {
    await expect(
      copyEnvironment('staging', 'production', { projectDir: tmpDir })
    ).rejects.toThrow('No envault project found');
  });
});
