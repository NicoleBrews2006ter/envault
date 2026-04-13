import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateEnvironments } from './validate';
import { writeConfig } from '../config/project';
import { writeKeys } from '../crypto/keyfile';
import { getEncryptedPath } from '../crypto/envfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-validate-test-'));
}

vi.mock('../crypto/keyfile', () => ({
  readKeys: vi.fn(),
  writeKeys: vi.fn(),
}));

import { readKeys } from '../crypto/keyfile';

describe('validateEnvironments', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('throws if no config exists', async () => {
    await expect(validateEnvironments({ projectDir: tmpDir })).rejects.toThrow(
      'No envault configuration found'
    );
  });

  it('returns invalid result when key and file are missing', async () => {
    writeConfig(tmpDir, { environments: ['staging'] });
    vi.mocked(readKeys).mockReturnValue({});

    const results = await validateEnvironments({ projectDir: tmpDir });
    expect(results).toHaveLength(1);
    expect(results[0].environment).toBe('staging');
    expect(results[0].hasKey).toBe(false);
    expect(results[0].hasEncryptedFile).toBe(false);
    expect(results[0].valid).toBe(false);
  });

  it('returns valid result when key and encrypted file both exist', async () => {
    writeConfig(tmpDir, { environments: ['production'] });
    vi.mocked(readKeys).mockReturnValue({ production: 'some-passphrase' });

    const encryptedFile = path.join(tmpDir, getEncryptedPath('production'));
    fs.mkdirSync(path.dirname(encryptedFile), { recursive: true });
    fs.writeFileSync(encryptedFile, 'encrypted-content');

    const results = await validateEnvironments({ projectDir: tmpDir });
    expect(results[0].hasKey).toBe(true);
    expect(results[0].hasEncryptedFile).toBe(true);
    expect(results[0].valid).toBe(true);
  });

  it('handles multiple environments with mixed validity', async () => {
    writeConfig(tmpDir, { environments: ['dev', 'prod'] });
    vi.mocked(readKeys).mockReturnValue({ dev: 'dev-pass' });

    const results = await validateEnvironments({ projectDir: tmpDir });
    expect(results).toHaveLength(2);
    expect(results.find((r) => r.environment === 'dev')?.hasKey).toBe(true);
    expect(results.find((r) => r.environment === 'prod')?.hasKey).toBe(false);
  });
});
