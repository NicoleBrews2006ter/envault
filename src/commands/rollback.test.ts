import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rollback } from './rollback';
import { createDefaultConfig, writeConfig } from '../config/project';
import { getSnapshotDir, getSnapshotPath } from './snapshot';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-rollback-'));
}

vi.mock('../crypto/keyfile', () => ({
  readKeys: vi.fn().mockResolvedValue({
    'myapp:production': { passphrase: 'test-passphrase' },
  }),
}));

vi.mock('../crypto/envfile', () => ({
  decryptEnvFile: vi.fn().mockResolvedValue('API_KEY=abc\nDB_URL=postgres://localhost'),
  encryptEnvFile: vi.fn().mockResolvedValue(undefined),
  getEncryptedPath: vi.fn().mockImplementation((dir, env) =>
    path.join(dir, `.envault/${env}.enc`)
  ),
}));

describe('rollback', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig('myapp');
    config.environments = ['production'];
    await writeConfig(tmpDir, config);

    const snapshotDir = getSnapshotDir(tmpDir, 'production');
    fs.mkdirSync(snapshotDir, { recursive: true });
    fs.writeFileSync(path.join(snapshotDir, '2024-01-01T00-00-00.enc'), 'snap1');
    fs.writeFileSync(path.join(snapshotDir, '2024-01-02T00-00-00.enc'), 'snap2');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('rolls back to the previous snapshot automatically', async () => {
    const result = await rollback('production', { projectDir: tmpDir });
    expect(result.environment).toBe('production');
    expect(result.snapshotId).toBe('2024-01-01T00-00-00');
    expect(result.restoredAt).toBeDefined();
  });

  it('rolls back to a specific snapshot by id', async () => {
    const result = await rollback('production', {
      projectDir: tmpDir,
      snapshotId: '2024-01-01T00-00-00',
    });
    expect(result.snapshotId).toBe('2024-01-01T00-00-00');
  });

  it('throws if environment does not exist', async () => {
    await expect(rollback('staging', { projectDir: tmpDir })).rejects.toThrow(
      'Environment "staging" not found'
    );
  });

  it('throws if no snapshots directory exists', async () => {
    const config = createDefaultConfig('myapp');
    config.environments = ['staging'];
    await writeConfig(tmpDir, config);
    await expect(rollback('staging', { projectDir: tmpDir })).rejects.toThrow(
      'No snapshots found'
    );
  });
});
