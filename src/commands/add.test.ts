import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { addEnvFile } from './add';
import { createDefaultConfig, writeConfig } from '../config/project';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-add-test-'));
}

vi.mock('../crypto/keyfile', () => ({
  readKeys: vi.fn(() => ({ 'test-project-id': 'mock-passphrase-32-chars-long!!' })),
}));

vi.mock('../crypto/envfile', () => ({
  encryptEnvFile: vi.fn().mockResolvedValue(undefined),
  getEncryptedPath: vi.fn((p: string) => p + '.enc'),
}));

describe('addEnvFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig('test-project-id', 'test-project');
    writeConfig(tmpDir, config);
    fs.writeFileSync(path.join(tmpDir, '.env'), 'SECRET=hello\nAPI_KEY=world\n');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('throws if no envault config exists', async () => {
    const emptyDir = makeTempDir();
    try {
      await expect(addEnvFile({ projectDir: emptyDir })).rejects.toThrow('No envault project found');
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it('throws if the env file does not exist', async () => {
    await expect(
      addEnvFile({ projectDir: tmpDir, env: '.env.missing' })
    ).rejects.toThrow('Env file not found');
  });

  it('encrypts the env file successfully', async () => {
    await expect(addEnvFile({ projectDir: tmpDir, env: '.env' })).resolves.toBeUndefined();
  });

  it('adds env file name to config if not already tracked', async () => {
    const { readConfig } = await import('../config/project');
    await addEnvFile({ projectDir: tmpDir, env: '.env' });
    const config = readConfig(tmpDir);
    expect(config.envFiles).toContain('.env');
  });
});
