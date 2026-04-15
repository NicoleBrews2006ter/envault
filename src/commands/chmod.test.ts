import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { chmod } from './chmod';
import { createDefaultConfig, writeConfig } from '../config/project';
import { writeKeys } from '../crypto/keyfile';
import { getEncryptedPath } from '../crypto/envfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-chmod-'));
}

describe('chmod', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig('test-project');
    config.environments = ['production'];
    await writeConfig(tmpDir, config);
    await writeKeys({ 'test-project': { production: 'passphrase-abc' } });
    const encPath = getEncryptedPath(tmpDir, 'production');
    fs.mkdirSync(path.dirname(encPath), { recursive: true });
    fs.writeFileSync(encPath, 'encrypted-data');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('sets owner-only permissions', async () => {
    const result = await chmod(tmpDir, 'production', 'owner');
    expect(result.mode).toBe('owner');
    expect(result.environment).toBe('production');
    const stat = fs.statSync(getEncryptedPath(tmpDir, 'production'));
    expect(stat.mode & 0o777).toBe(0o600);
  });

  it('sets group-readable permissions', async () => {
    const result = await chmod(tmpDir, 'production', 'group');
    expect(result.mode).toBe('group');
    const stat = fs.statSync(getEncryptedPath(tmpDir, 'production'));
    expect(stat.mode & 0o777).toBe(0o640);
  });

  it('sets world-readable permissions', async () => {
    const result = await chmod(tmpDir, 'production', 'world');
    expect(result.mode).toBe('world');
    const stat = fs.statSync(getEncryptedPath(tmpDir, 'production'));
    expect(stat.mode & 0o777).toBe(0o644);
  });

  it('throws for unknown environment', async () => {
    await expect(chmod(tmpDir, 'staging', 'owner')).rejects.toThrow(
      'Environment "staging" does not exist.'
    );
  });

  it('reports changed flag correctly when mode differs', async () => {
    await chmod(tmpDir, 'production', 'world');
    const result = await chmod(tmpDir, 'production', 'owner');
    expect(result.changed).toBe(true);
    expect(result.previousMode).toBe('world');
  });
});
