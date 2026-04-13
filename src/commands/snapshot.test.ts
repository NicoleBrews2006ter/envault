import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach } from 'bun:test';
import { createSnapshot, listSnapshots, restoreSnapshot, getSnapshotDir } from './snapshot';
import { createDefaultConfig, writeConfig } from '../config/project';
import { writeKeys } from '../crypto/keyfile';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { generatePassphrase } from '../crypto/keyfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-snapshot-'));
}

describe('snapshot', () => {
  let projectDir: string;
  let key: string;

  beforeEach(async () => {
    projectDir = makeTempDir();
    const config = createDefaultConfig();
    config.environments = ['production'];
    await writeConfig(projectDir, config);
    key = generatePassphrase();
    await writeKeys(projectDir, { production: key });
    const encPath = getEncryptedPath(projectDir, 'production');
    await encryptEnvFile('API_KEY=secret\nDEBUG=false', encPath, key);
  });

  it('creates a snapshot file', async () => {
    const snap = await createSnapshot(projectDir, 'production', 'before-deploy');
    expect(snap.environment).toBe('production');
    expect(snap.label).toBe('before-deploy');
    expect(snap.contents).toContain('API_KEY=secret');
    const dir = getSnapshotDir(projectDir);
    expect(fs.readdirSync(dir).length).toBe(1);
  });

  it('throws if environment does not exist', async () => {
    await expect(createSnapshot(projectDir, 'staging')).rejects.toThrow('does not exist');
  });

  it('lists snapshots for an environment', async () => {
    await createSnapshot(projectDir, 'production');
    await createSnapshot(projectDir, 'production', 'v2');
    const snaps = await listSnapshots(projectDir, 'production');
    expect(snaps.length).toBe(2);
  });

  it('lists all snapshots when no environment filter', async () => {
    await createSnapshot(projectDir, 'production');
    const snaps = await listSnapshots(projectDir);
    expect(snaps.length).toBeGreaterThanOrEqual(1);
  });

  it('restores a snapshot', async () => {
    const snap = await createSnapshot(projectDir, 'production');
    await encryptEnvFile('API_KEY=changed', getEncryptedPath(projectDir, 'production'), key);
    await restoreSnapshot(projectDir, 'production', snap.timestamp);
    const { decryptEnvFile } = await import('../crypto/envfile');
    const restored = await decryptEnvFile(getEncryptedPath(projectDir, 'production'), key);
    expect(restored).toContain('API_KEY=secret');
  });

  it('throws when restoring nonexistent snapshot', async () => {
    await expect(restoreSnapshot(projectDir, 'production', 'bad-ts')).rejects.toThrow('Snapshot not found');
  });
});
