import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { inject } from './inject';
import { createDefaultConfig, writeConfig } from '../config/project';
import { storeKey, writeKeys } from '../crypto/keyfile';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { generatePassphrase } from '../crypto/keyfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-inject-test-'));
}

describe('inject', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('throws if project not initialised', async () => {
    await expect(inject(tmpDir, 'development', ['echo', 'hi'])).rejects.toThrow(
      'No envault project found'
    );
  });

  it('throws if environment does not exist', async () => {
    const config = createDefaultConfig();
    writeConfig(tmpDir, config);
    await expect(inject(tmpDir, 'staging', ['echo', 'hi'])).rejects.toThrow(
      'Environment "staging" does not exist'
    );
  });

  it('throws if no encrypted file present', async () => {
    const config = createDefaultConfig();
    writeConfig(tmpDir, config);
    await expect(inject(tmpDir, 'development', ['echo', 'hi'])).rejects.toThrow(
      'No encrypted file found'
    );
  });

  it('throws if no key stored for environment', async () => {
    const config = createDefaultConfig();
    writeConfig(tmpDir, config);
    const envFile = path.join(tmpDir, '.env.development');
    fs.writeFileSync(envFile, 'FOO=bar\n');
    const passphrase = generatePassphrase();
    await encryptEnvFile(envFile, getEncryptedPath(tmpDir, 'development'), passphrase);
    // do NOT store key
    await expect(inject(tmpDir, 'development', ['echo', 'hi'])).rejects.toThrow(
      'No key found'
    );
  });

  it('returns inject result with correct count', async () => {
    const config = createDefaultConfig();
    writeConfig(tmpDir, config);
    const envFile = path.join(tmpDir, '.env.development');
    fs.writeFileSync(envFile, 'FOO=bar\nBAZ=qux\n# comment\n\nEMPTY=\n');
    const passphrase = generatePassphrase();
    const encPath = getEncryptedPath(tmpDir, 'development');
    await encryptEnvFile(envFile, encPath, passphrase);
    const projectKey = `${path.resolve(tmpDir)}:development`;
    const keys: Record<string, { passphrase: string }> = {};
    keys[projectKey] = { passphrase };
    writeKeys(keys as any);
    const result = await inject(tmpDir, 'development', ['node', '--version']);
    expect(result.environment).toBe('development');
    expect(result.injected).toBe(3); // FOO, BAZ, EMPTY
    expect(result.command).toBe('node --version');
  });
});
