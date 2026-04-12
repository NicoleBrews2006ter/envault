import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { rotateKey } from './rotate';
import * as projectConfig from '../config/project';
import * as keyfile from '../crypto/keyfile';
import * as envfile from '../crypto/envfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-rotate-test-'));
}

describe('rotateKey', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('returns error if config does not exist', async () => {
    jest.spyOn(projectConfig, 'configExists').mockReturnValue(false);

    const result = await rotateKey({ environment: 'default', force: false });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not initialized/i);
  });

  it('returns error if no encrypted file exists for environment', async () => {
    jest.spyOn(projectConfig, 'configExists').mockReturnValue(true);
    jest.spyOn(projectConfig, 'readConfig').mockReturnValue({ name: 'test', environments: ['default'] });
    jest.spyOn(envfile, 'getEncryptedPath').mockReturnValue(path.join(tmpDir, 'nonexistent.enc'));

    const result = await rotateKey({ environment: 'default', force: false });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no encrypted file/i);
  });

  it('returns error if key not found for environment', async () => {
    const encPath = path.join(tmpDir, 'default.env.enc');
    fs.writeFileSync(encPath, 'dummy');

    jest.spyOn(projectConfig, 'configExists').mockReturnValue(true);
    jest.spyOn(projectConfig, 'readConfig').mockReturnValue({ name: 'test', environments: ['default'] });
    jest.spyOn(envfile, 'getEncryptedPath').mockReturnValue(encPath);
    jest.spyOn(keyfile, 'readKeys').mockReturnValue({});

    const result = await rotateKey({ environment: 'default', force: false });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no key found/i);
  });

  it('successfully rotates key and re-encrypts file', async () => {
    const encPath = path.join(tmpDir, 'default.env.enc');
    fs.writeFileSync(encPath, 'dummy-encrypted-content');

    jest.spyOn(projectConfig, 'configExists').mockReturnValue(true);
    jest.spyOn(projectConfig, 'readConfig').mockReturnValue({ name: 'test', environments: ['default'] });
    jest.spyOn(envfile, 'getEncryptedPath').mockReturnValue(encPath);
    jest.spyOn(keyfile, 'readKeys').mockReturnValue({ default: 'old-passphrase' });
    jest.spyOn(keyfile, 'generatePassphrase').mockReturnValue('new-passphrase');
    jest.spyOn(keyfile, 'storeKey').mockImplementation(() => {});
    jest.spyOn(envfile, 'decryptEnvFile').mockResolvedValue('KEY=value\nFOO=bar');
    jest.spyOn(envfile, 'encryptEnvFile').mockResolvedValue(undefined);

    const result = await rotateKey({ environment: 'default', force: false });

    expect(result.success).toBe(true);
    expect(keyfile.storeKey).toHaveBeenCalledWith('default', 'new-passphrase', expect.any(String));
    expect(envfile.encryptEnvFile).toHaveBeenCalledWith(
      expect.any(String),
      'KEY=value\nFOO=bar',
      'new-passphrase'
    );
  });
});
