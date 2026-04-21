import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { placeholder } from './placeholder';
import { createDefaultConfig, writeConfig } from '../config/project';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { generatePassphrase, storeKey } from '../crypto/keyfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-placeholder-'));
}

describe('placeholder', () => {
  let tmpDir: string;
  let passphrase: string;

  beforeEach(async () => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig('test-project');
    config.environments = ['development'];
    await writeConfig(tmpDir, config);

    passphrase = generatePassphrase();
    await storeKey('test-project', 'development', passphrase);

    const envContent = 'DB_HOST=localhost\nDB_PORT=5432\nAPP_NAME=MyApp\n';
    const encPath = getEncryptedPath(tmpDir, 'development');
    await encryptEnvFile(envContent, encPath, passphrase);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('substitutes known placeholders', async () => {
    const tplPath = path.join(tmpDir, 'config.template.yml');
    fs.writeFileSync(tplPath, 'host: {{DB_HOST}}\nport: {{DB_PORT}}\n');

    const outPath = path.join(tmpDir, 'config.yml');
    const result = await placeholder(tplPath, 'development', outPath, tmpDir);

    expect(result.substituted).toBe(2);
    expect(result.missing).toHaveLength(0);
    const output = fs.readFileSync(outPath, 'utf-8');
    expect(output).toContain('host: localhost');
    expect(output).toContain('port: 5432');
  });

  it('tracks missing placeholders', async () => {
    const tplPath = path.join(tmpDir, 'tmpl.txt');
    fs.writeFileSync(tplPath, 'name={{APP_NAME}} secret={{SECRET_KEY}}');

    const outPath = path.join(tmpDir, 'out.txt');
    const result = await placeholder(tplPath, 'development', outPath, tmpDir);

    expect(result.substituted).toBe(1);
    expect(result.missing).toContain('SECRET_KEY');
    const output = fs.readFileSync(outPath, 'utf-8');
    expect(output).toContain('name=MyApp');
    expect(output).toContain('{{SECRET_KEY}}');
  });

  it('throws when environment does not exist', async () => {
    const tplPath = path.join(tmpDir, 'tmpl.txt');
    fs.writeFileSync(tplPath, 'x={{X}}');
    await expect(
      placeholder(tplPath, 'staging', path.join(tmpDir, 'out.txt'), tmpDir)
    ).rejects.toThrow('Environment "staging" not found');
  });

  it('throws when template file is missing', async () => {
    await expect(
      placeholder(path.join(tmpDir, 'no.tmpl'), 'development', path.join(tmpDir, 'out.txt'), tmpDir)
    ).rejects.toThrow('Template file not found');
  });
});
