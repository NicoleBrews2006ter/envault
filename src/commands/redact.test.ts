import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach } from 'vitest';
import { redact } from './redact';
import { createDefaultConfig, writeConfig } from '../config/project';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { writeKeys } from '../crypto/keyfile';
import { generatePassphrase } from '../crypto/keyfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-redact-'));
}

describe('redact', () => {
  let tmpDir: string;
  let passphrase: string;

  beforeEach(async () => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig();
    config.environments = ['production'];
    writeConfig(tmpDir, config);

    passphrase = generatePassphrase();
    writeKeys(tmpDir, { production: passphrase });

    const envContent = 'API_KEY=super-secret\nDB_PASS=hunter2\nAPP_NAME=myapp\n';
    const encPath = getEncryptedPath(tmpDir, 'production');
    await encryptEnvFile(envContent, encPath, passphrase);
  });

  it('redacts specified keys from output', async () => {
    const result = await redact(tmpDir, 'production', ['API_KEY', 'DB_PASS']);
    expect(result.redacted).toBe(2);
    expect(result.output).toContain('API_KEY=***REDACTED***');
    expect(result.output).toContain('DB_PASS=***REDACTED***');
    expect(result.output).toContain('APP_NAME=myapp');
  });

  it('uses custom placeholder', async () => {
    const result = await redact(tmpDir, 'production', ['API_KEY'], '[HIDDEN]');
    expect(result.output).toContain('API_KEY=[HIDDEN]');
  });

  it('returns zero redacted when no keys match', async () => {
    const result = await redact(tmpDir, 'production', ['NONEXISTENT']);
    expect(result.redacted).toBe(0);
    expect(result.output).toContain('API_KEY=super-secret');
  });

  it('is case-insensitive for key matching', async () => {
    const result = await redact(tmpDir, 'production', ['api_key']);
    expect(result.redacted).toBe(1);
    expect(result.output).toContain('API_KEY=***REDACTED***');
  });

  it('throws when project not initialised', async () => {
    await expect(redact('/nonexistent', 'production', [])).rejects.toThrow('No envault project found');
  });

  it('throws when environment does not exist', async () => {
    await expect(redact(tmpDir, 'staging', [])).rejects.toThrow('Environment "staging" does not exist');
  });
});
