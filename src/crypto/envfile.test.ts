import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { encryptEnvFile, decryptEnvFile, getEncryptedPath, parseEnvContents } from './envfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-envfile-'));
}

describe('encryptEnvFile / decryptEnvFile', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTempDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('encrypts and decrypts a .env file', () => {
    const envPath = path.join(tmpDir, '.env');
    const encPath = path.join(tmpDir, '.env.enc');
    const outPath = path.join(tmpDir, '.env.out');
    const contents = 'API_KEY=abc123\nDB_URL=postgres://localhost/test';

    fs.writeFileSync(envPath, contents);
    encryptEnvFile(envPath, encPath, 'passphrase');
    expect(fs.existsSync(encPath)).toBe(true);
    expect(fs.readFileSync(encPath, 'utf-8')).not.toBe(contents);

    decryptEnvFile(encPath, outPath, 'passphrase');
    expect(fs.readFileSync(outPath, 'utf-8')).toBe(contents);
  });

  it('throws if source env file is missing', () => {
    expect(() =>
      encryptEnvFile(path.join(tmpDir, 'missing.env'), path.join(tmpDir, 'out.enc'), 'pass')
    ).toThrow('Env file not found');
  });
});

describe('getEncryptedPath', () => {
  it('appends .enc extension', () => {
    expect(getEncryptedPath('/project/.env')).toBe('/project/.env.enc');
  });
});

describe('parseEnvContents', () => {
  it('parses key=value pairs', () => {
    const result = parseEnvContents('FOO=bar\nBAZ=qux');
    expect(result).toEqual({ FOO: 'bar', BAZ: 'qux' });
  });

  it('ignores comments and blank lines', () => {
    const result = parseEnvContents('# comment\n\nKEY=val');
    expect(result).toEqual({ KEY: 'val' });
  });

  it('strips surrounding quotes from values', () => {
    const result = parseEnvContents('SECRET="my secret"');
    expect(result).toEqual({ SECRET: 'my secret' });
  });
});
