import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { diffCommand } from './diff';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-diff-test-'));
}

vi.mock('../config/project');
vi.mock('../crypto/keyfile');
vi.mock('../crypto/envfile');

import { configExists, readConfig } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { decryptEnvFile, getEncryptedPath, parseEnvContents } from '../crypto/envfile';

describe('diffCommand', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
    vi.mocked(configExists).mockReturnValue(true);
    vi.mocked(readConfig).mockReturnValue({
      projectId: 'proj-123',
      environments: { staging: { description: 'Staging' } },
    } as any);
    vi.mocked(readKeys).mockReturnValue({ 'proj-123': { staging: 'test-key' } } as any);
    vi.mocked(getEncryptedPath).mockReturnValue(path.join(tmpDir, '.env.staging.enc'));
    fs.writeFileSync(path.join(tmpDir, '.env.staging.enc'), 'encrypted');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('throws if config does not exist', async () => {
    vi.mocked(configExists).mockReturnValue(false);
    await expect(diffCommand('staging')).rejects.toThrow('No envault config found');
  });

  it('throws if environment does not exist', async () => {
    await expect(diffCommand('production')).rejects.toThrow('Environment "production" does not exist');
  });

  it('throws if no key found for environment', async () => {
    vi.mocked(readKeys).mockReturnValue({} as any);
    await expect(diffCommand('staging')).rejects.toThrow('No key found');
  });

  it('throws if plaintext file not found', async () => {
    vi.mocked(decryptEnvFile).mockResolvedValue('KEY=value');
    vi.mocked(parseEnvContents).mockReturnValue({ KEY: 'value' });
    await expect(diffCommand('staging', '/nonexistent/.env')).rejects.toThrow('Plaintext file not found');
  });

  it('returns correct diff result', async () => {
    const plaintextPath = path.join(tmpDir, '.env');
    fs.writeFileSync(plaintextPath, 'KEY=newvalue\nNEW_KEY=added');
    vi.mocked(decryptEnvFile).mockResolvedValue('KEY=oldvalue\nOLD_KEY=removed');
    vi.mocked(parseEnvContents)
      .mockReturnValueOnce({ KEY: 'oldvalue', OLD_KEY: 'removed' })
      .mockReturnValueOnce({ KEY: 'newvalue', NEW_KEY: 'added' });

    const result = await diffCommand('staging', plaintextPath);
    expect(result.environment).toBe('staging');
    expect(result.onlyInEncrypted).toContain('OLD_KEY');
    expect(result.onlyInPlaintext).toContain('NEW_KEY');
    expect(result.changed).toContain('KEY');
    expect(result.unchanged).toBe(0);
  });
});
