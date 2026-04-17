import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach } from 'vitest';
import { fmt, formatEnvContents } from './fmt';
import { createDefaultConfig, writeConfig } from '../config/project';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { storeKey } from '../crypto/keyfile';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-fmt-'));
}

describe('formatEnvContents', () => {
  it('removes trailing whitespace from lines', () => {
    expect(formatEnvContents('FOO=bar   \nBAZ=qux  \n')).toBe('FOO=bar\nBAZ=qux\n');
  });

  it('collapses multiple blank lines into one', () => {
    const input = 'A=1\n\n\nB=2\n';
    expect(formatEnvContents(input)).toBe('A=1\n\nB=2\n');
  });

  it('removes leading blank lines', () => {
    expect(formatEnvContents('\n\nFOO=bar\n')).toBe('FOO=bar\n');
  });

  it('ensures single trailing newline', () => {
    expect(formatEnvContents('FOO=bar')).toBe('FOO=bar\n');
    expect(formatEnvContents('FOO=bar\n\n\n')).toBe('FOO=bar\n');
  });
});

describe('fmt command', () => {
  let tmpDir: string;
  const passphrase = 'test-passphrase-fmt';
  const projectId = 'fmt-test-project';
  const env = 'development';

  beforeEach(async () => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig(projectId);
    writeConfig(tmpDir, config);
    storeKey(projectId, env, passphrase);
    const encPath = getEncryptedPath(tmpDir, env);
    await encryptEnvFile('\n\nFOO=bar   \n\n\nBAZ=qux  \n', encPath, passphrase);
  });

  it('formats the env file and reports change', async () => {
    const result = await fmt(tmpDir, { env });
    expect(result.formatted).toBe(true);
    expect(result.env).toBe(env);
  });

  it('reports no change when already formatted', async () => {
    await fmt(tmpDir, { env });
    const result = await fmt(tmpDir, { env });
    expect(result.formatted).toBe(false);
  });

  it('check mode returns true when formatting needed without writing', async () => {
    const result = await fmt(tmpDir, { env, check: true });
    expect(result.formatted).toBe(true);
    // File should remain unformatted
    const result2 = await fmt(tmpDir, { env, check: true });
    expect(result2.formatted).toBe(true);
  });

  it('throws when project not initialized', async () => {
    await expect(fmt('/nonexistent', { env })).rejects.toThrow('No envault project found');
  });
});
