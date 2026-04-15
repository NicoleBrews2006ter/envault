import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { clean } from './clean';
import { createDefaultConfig, writeConfig } from '../config/project';
import { getEncryptedPath } from '../crypto/envfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-clean-'));
}

function setupProject(dir: string, envs: string[]) {
  const config = createDefaultConfig(dir);
  config.environments = envs;
  writeConfig(dir, config);
}

function touchFile(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, '');
}

describe('clean', () => {
  it('throws if no config exists', async () => {
    const dir = makeTempDir();
    await expect(clean(dir)).rejects.toThrow('No envault project found');
  });

  it('skips environments with no encrypted file', async () => {
    const dir = makeTempDir();
    setupProject(dir, ['staging']);
    touchFile(path.join(dir, '.env.staging'));
    const result = await clean(dir);
    expect(result.skipped).toContain('staging');
    expect(result.removed).toHaveLength(0);
  });

  it('skips environments with no decrypted file', async () => {
    const dir = makeTempDir();
    setupProject(dir, ['staging']);
    touchFile(getEncryptedPath(dir, 'staging'));
    const result = await clean(dir);
    expect(result.skipped).toContain('staging');
    expect(result.removed).toHaveLength(0);
  });

  it('removes decrypted file when encrypted counterpart exists', async () => {
    const dir = makeTempDir();
    setupProject(dir, ['production']);
    touchFile(getEncryptedPath(dir, 'production'));
    const decrypted = path.join(dir, '.env.production');
    touchFile(decrypted);
    const result = await clean(dir);
    expect(result.removed).toContain('production');
    expect(fs.existsSync(decrypted)).toBe(false);
  });

  it('dry run does not remove files', async () => {
    const dir = makeTempDir();
    setupProject(dir, ['production']);
    touchFile(getEncryptedPath(dir, 'production'));
    const decrypted = path.join(dir, '.env.production');
    touchFile(decrypted);
    const result = await clean(dir, undefined, true);
    expect(result.removed).toContain('production');
    expect(fs.existsSync(decrypted)).toBe(true);
  });

  it('reports error for unknown environment', async () => {
    const dir = makeTempDir();
    setupProject(dir, ['staging']);
    const result = await clean(dir, ['nonexistent']);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/not found/);
  });
});
