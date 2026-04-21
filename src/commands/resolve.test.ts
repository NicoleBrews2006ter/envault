import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { resolve } from './resolve';
import { createDefaultConfig, writeConfig } from '../config/project';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { writeKeys } from '../crypto/keyfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-resolve-'));
}

describe('resolve', () => {
  it('throws if project is not initialised', async () => {
    const dir = makeTempDir();
    await expect(resolve(dir, 'development', 'API_KEY')).rejects.toThrow(
      'No envault project found'
    );
  });

  it('throws if environment does not exist', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig();
    config.environments = ['production'];
    writeConfig(dir, config);
    await expect(resolve(dir, 'staging', 'API_KEY')).rejects.toThrow(
      'Environment "staging" does not exist'
    );
  });

  it('resolves a key from a plain env file', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig();
    config.environments = ['development'];
    writeConfig(dir, config);
    fs.writeFileSync(
      path.join(dir, '.env.development'),
      'API_KEY=hello123\nDEBUG=true\n'
    );
    const result = await resolve(dir, 'development', 'API_KEY');
    expect(result.found).toBe(true);
    expect(result.value).toBe('hello123');
  });

  it('returns found=false when key is missing from plain env file', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig();
    config.environments = ['development'];
    writeConfig(dir, config);
    fs.writeFileSync(path.join(dir, '.env.development'), 'DEBUG=true\n');
    const result = await resolve(dir, 'development', 'MISSING_KEY');
    expect(result.found).toBe(false);
    expect(result.value).toBeNull();
  });

  it('resolves a key from an encrypted env file', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig();
    config.environments = ['production'];
    writeConfig(dir, config);

    const passphrase = 'test-passphrase-abc';
    const projectName = path.basename(dir);
    const plainPath = path.join(dir, '.env.production');
    fs.writeFileSync(plainPath, 'SECRET=supersecret\n');
    const encryptedPath = getEncryptedPath(dir, 'production');
    await encryptEnvFile(plainPath, encryptedPath, passphrase);
    fs.unlinkSync(plainPath);

    writeKeys({ [`${projectName}:production`]: passphrase });

    const result = await resolve(dir, 'production', 'SECRET');
    expect(result.found).toBe(true);
    expect(result.value).toBe('supersecret');
  });

  it('strips surrounding quotes from values', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig();
    config.environments = ['development'];
    writeConfig(dir, config);
    fs.writeFileSync(path.join(dir, '.env.development'), 'TOKEN="my-token"\n');
    const result = await resolve(dir, 'development', 'TOKEN');
    expect(result.value).toBe('my-token');
  });
});
