import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { unlockEnv } from './unlock';
import { createDefaultConfig, writeConfig } from '../config/project';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import * as keyfile from '../crypto/keyfile';
import { generatePassphrase } from '../crypto/keyfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-unlock-test-'));
}

describe('unlockEnv', () => {
  let tmpDir: string;
  const testPassphrase = 'test-passphrase-unlock-32chars!!!';

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('returns error if no config exists', async () => {
    const result = await unlockEnv({ projectDir: tmpDir });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/envault init/);
  });

  it('returns error if no key found for project', async () => {
    const config = createDefaultConfig('test-project');
    writeConfig(tmpDir, config);
    vi.spyOn(keyfile, 'readKeys').mockReturnValue({});

    const result = await unlockEnv({ projectDir: tmpDir });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/No key found/);
  });

  it('returns error if no encrypted file found', async () => {
    const config = createDefaultConfig('test-project');
    writeConfig(tmpDir, config);
    vi.spyOn(keyfile, 'readKeys').mockReturnValue({ [config.projectId]: testPassphrase });

    const result = await unlockEnv({ projectDir: tmpDir });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/No encrypted env file/);
  });

  it('successfully decrypts an encrypted env file', async () => {
    const config = createDefaultConfig('test-project');
    writeConfig(tmpDir, config);
    vi.spyOn(keyfile, 'readKeys').mockReturnValue({ [config.projectId]: testPassphrase });

    const envContent = 'API_KEY=hello\nSECRET=world\n';
    const sourcePath = path.join(tmpDir, '.env.plaintext-tmp');
    fs.writeFileSync(sourcePath, envContent);

    const encryptedPath = getEncryptedPath(tmpDir, 'default');
    await encryptEnvFile(sourcePath, encryptedPath, testPassphrase);

    const result = await unlockEnv({ projectDir: tmpDir });
    expect(result.success).toBe(true);
    expect(result.outputPath).toBeDefined();
    expect(fs.existsSync(result.outputPath!)).toBe(true);
    const decrypted = fs.readFileSync(result.outputPath!, 'utf-8');
    expect(decrypted).toBe(envContent);
  });
});
