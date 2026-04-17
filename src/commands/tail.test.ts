import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach } from 'vitest';
import { tail } from './tail';
import { createDefaultConfig, writeConfig } from '../config/project';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { storeKey } from '../crypto/keyfile';
import { generatePassphrase } from '../crypto/keyfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-tail-'));
}

describe('tail', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig(tmpDir);
    config.environments = ['development'];
    writeConfig(tmpDir, config);
  });

  it('throws if project not initialized', async () => {
    const empty = makeTempDir();
    await expect(tail('development', empty)).rejects.toThrow('No envault project found');
  });

  it('throws if environment does not exist', async () => {
    await expect(tail('production', tmpDir)).rejects.toThrow('does not exist');
  });

  it('throws if no encrypted file found', async () => {
    await expect(tail('development', tmpDir)).rejects.toThrow('No encrypted file found');
  });

  it('returns last N lines masked by default', async () => {
    const config = createDefaultConfig(tmpDir);
    config.environments = ['development'];
    writeConfig(tmpDir, config);

    const passphrase = generatePassphrase();
    const envContent = Array.from({ length: 15 }, (_, i) => `KEY_${i}=value${i}`).join('\n');
    const envPath = path.join(tmpDir, '.env.development');
    fs.writeFileSync(envPath, envContent);

    const encryptedPath = getEncryptedPath(tmpDir, 'development');
    await encryptEnvFile(envPath, encryptedPath, passphrase);
    storeKey(config.projectId, 'development', passphrase);

    const lines = await tail('development', tmpDir, { lines: 5 });
    expect(lines).toHaveLength(5);
    lines.forEach(line => expect(line).toMatch(/^KEY_\d+=\*\*\*$/));
  });

  it('returns raw values when raw option is set', async () => {
    const config = createDefaultConfig(tmpDir);
    config.environments = ['development'];
    writeConfig(tmpDir, config);

    const passphrase = generatePassphrase();
    const envContent = 'FOO=bar\nBAZ=qux';
    const envPath = path.join(tmpDir, '.env.development');
    fs.writeFileSync(envPath, envContent);

    const encryptedPath = getEncryptedPath(tmpDir, 'development');
    await encryptEnvFile(envPath, encryptedPath, passphrase);
    storeKey(config.projectId, 'development', passphrase);

    const lines = await tail('development', tmpDir, { lines: 10, raw: true });
    expect(lines).toContain('FOO=bar');
    expect(lines).toContain('BAZ=qux');
  });
});
