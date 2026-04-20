import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rekey } from './rekey';
import { writeConfig } from '../config/project';
import { storeKey } from '../crypto/keyfile';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { generatePassphrase } from '../crypto/keyfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-rekey-'));
}

describe('rekey', () => {
  let tmpDir: string;
  const projectName = 'rekey-test-project';
  const envName = 'staging';
  let originalHome: string | undefined;

  beforeEach(async () => {
    tmpDir = makeTempDir();
    originalHome = process.env.HOME;
    process.env.HOME = tmpDir;

    writeConfig(tmpDir, { name: projectName, environments: [envName] });

    const passphrase = generatePassphrase();
    storeKey(projectName, envName, passphrase);

    const envContent = 'API_KEY=secret123\nDB_URL=postgres://localhost/test\n';
    const tmpEnvFile = path.join(tmpDir, `.env.${envName}`);
    fs.writeFileSync(tmpEnvFile, envContent, 'utf8');
    await encryptEnvFile(tmpEnvFile, passphrase);
    fs.unlinkSync(tmpEnvFile);
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should rekey an environment with a new passphrase', async () => {
    const result = await rekey({ environment: envName, projectDir: tmpDir });

    expect(result.environment).toBe(envName);
    expect(result.oldFingerprint).toBeTruthy();
    expect(result.newFingerprint).toBeTruthy();
    expect(result.oldFingerprint).not.toBe(result.newFingerprint);
    expect(fs.existsSync(result.encryptedPath)).toBe(true);
  });

  it('should allow decryption with new passphrase after rekey', async () => {
    const { decryptEnvFile } = await import('../crypto/envfile');
    const { readKeys } = await import('../crypto/keyfile');
    const { readConfig } = await import('../config/project');

    await rekey({ environment: envName, projectDir: tmpDir });

    const config = readConfig(tmpDir);
    const keys = readKeys();
    const newPassphrase = keys[config.name]?.[envName];
    expect(newPassphrase).toBeTruthy();

    const encryptedPath = getEncryptedPath(tmpDir, envName);
    const decrypted = await decryptEnvFile(encryptedPath, newPassphrase!);
    expect(decrypted).toContain('API_KEY=secret123');
  });

  it('should throw if environment does not exist', async () => {
    await expect(rekey({ environment: 'nonexistent', projectDir: tmpDir })).rejects.toThrow(
      'not found in project config'
    );
  });

  it('should accept a custom new passphrase', async () => {
    const customPassphrase = 'my-custom-passphrase-xyz';
    const result = await rekey({
      environment: envName,
      projectDir: tmpDir,
      newPassphrase: customPassphrase,
    });
    expect(result.newFingerprint).toBe(
      Buffer.from(customPassphrase).toString('base64').slice(0, 8)
    );
  });
});
