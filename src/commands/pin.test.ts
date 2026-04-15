import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pin, unpin, checkPin, getPinPath, computeChecksum } from './pin';
import { writeConfig } from '../config/project';
import { writeKeys } from '../crypto/keyfile';
import { getEncryptedPath } from '../crypto/envfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-pin-test-'));
}

async function setupProject(dir: string, env = 'production') {
  await writeConfig(dir, { environments: [env], defaultEnvironment: env });
  await writeKeys(dir, { [env]: 'test-key-abc123' });
  const encPath = getEncryptedPath(dir, env);
  const encDir = path.dirname(encPath);
  if (!fs.existsSync(encDir)) fs.mkdirSync(encDir, { recursive: true });
  fs.writeFileSync(encPath, 'encrypted-content-stub', 'utf-8');
}

describe('pin', () => {
  it('creates a pin file for a valid environment', async () => {
    const dir = makeTempDir();
    await setupProject(dir);
    const result = await pin(dir, 'production');
    expect(result.environment).toBe('production');
    expect(result.checksum).toHaveLength(64);
    expect(fs.existsSync(getPinPath(dir, 'production'))).toBe(true);
  });

  it('throws if environment does not exist', async () => {
    const dir = makeTempDir();
    await writeConfig(dir, { environments: [], defaultEnvironment: '' });
    await expect(pin(dir, 'staging')).rejects.toThrow(
      'Environment "staging" does not exist.'
    );
  });

  it('throws if no key is found for the environment', async () => {
    const dir = makeTempDir();
    await writeConfig(dir, { environments: ['staging'], defaultEnvironment: 'staging' });
    await writeKeys(dir, {});
    await expect(pin(dir, 'staging')).rejects.toThrow(
      'No key found for environment "staging".'
    );
  });

  it('throws if encrypted file does not exist', async () => {
    const dir = makeTempDir();
    await writeConfig(dir, { environments: ['dev'], defaultEnvironment: 'dev' });
    await writeKeys(dir, { dev: 'key123' });
    await expect(pin(dir, 'dev')).rejects.toThrow('Encrypted file not found');
  });
});

describe('unpin', () => {
  it('removes the pin file', async () => {
    const dir = makeTempDir();
    await setupProject(dir);
    await pin(dir, 'production');
    await unpin(dir, 'production');
    expect(fs.existsSync(getPinPath(dir, 'production'))).toBe(false);
  });

  it('throws if no pin exists', async () => {
    const dir = makeTempDir();
    await expect(unpin(dir, 'production')).rejects.toThrow(
      'No pin found for environment "production".'
    );
  });
});

describe('checkPin', () => {
  it('returns pinned false if no pin file', async () => {
    const dir = makeTempDir();
    const result = await checkPin(dir, 'production');
    expect(result.pinned).toBe(false);
  });

  it('returns valid true when checksum matches', async () => {
    const dir = makeTempDir();
    await setupProject(dir);
    await pin(dir, 'production');
    const result = await checkPin(dir, 'production');
    expect(result.pinned).toBe(true);
    expect(result.valid).toBe(true);
  });

  it('returns valid false when file has changed', async () => {
    const dir = makeTempDir();
    await setupProject(dir);
    await pin(dir, 'production');
    const encPath = getEncryptedPath(dir, 'production');
    fs.writeFileSync(encPath, 'modified-content', 'utf-8');
    const result = await checkPin(dir, 'production');
    expect(result.pinned).toBe(true);
    expect(result.valid).toBe(false);
  });
});
