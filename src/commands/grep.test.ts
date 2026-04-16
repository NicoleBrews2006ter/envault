import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach } from 'vitest';
import { grep } from './grep';
import { createDefaultConfig, writeConfig } from '../config/project';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { storeKey, generatePassphrase } from '../crypto/keyfile';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-grep-'));
}

describe('grep', () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTempDir();
    const config = createDefaultConfig('test-project');
    config.environments = ['development', 'production'];
    writeConfig(dir, config);
  });

  async function seedEnv(env: string, contents: string) {
    const passphrase = generatePassphrase();
    storeKey('test-project', env, passphrase);
    const srcPath = path.join(dir, `.env.${env}.tmp`);
    fs.writeFileSync(srcPath, contents);
    const encPath = getEncryptedPath(dir, env);
    await encryptEnvFile(srcPath, encPath, passphrase);
    fs.unlinkSync(srcPath);
    return passphrase;
  }

  it('finds matches by key', async () => {
    await seedEnv('development', 'DB_HOST=localhost\nAPI_KEY=secret123\n');
    const results = await grep('DB_', dir);
    expect(results.some((r) => r.key === 'DB_HOST')).toBe(true);
  });

  it('finds matches by value', async () => {
    await seedEnv('development', 'DB_HOST=localhost\nAPI_KEY=secret123\n');
    const results = await grep('secret', dir);
    expect(results.some((r) => r.key === 'API_KEY')).toBe(true);
  });

  it('returns matches across multiple environments', async () => {
    await seedEnv('development', 'SHARED_KEY=devvalue\n');
    await seedEnv('production', 'SHARED_KEY=prodvalue\n');
    const results = await grep('SHARED_KEY', dir);
    const envs = results.map((r) => r.environment);
    expect(envs).toContain('development');
    expect(envs).toContain('production');
  });

  it('returns empty array when no matches', async () => {
    await seedEnv('development', 'FOO=bar\n');
    const results = await grep('NONEXISTENT', dir);
    expect(results).toHaveLength(0);
  });

  it('throws if project not initialized', async () => {
    await expect(grep('FOO', makeTempDir())).rejects.toThrow('No envault project found');
  });
});
