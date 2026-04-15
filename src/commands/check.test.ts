import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { check } from './check';
import { createDefaultConfig, writeConfig } from '../config/project';
import { writeKeys } from '../crypto/keyfile';
import { getEncryptedPath } from '../crypto/envfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-check-'));
}

describe('check', () => {
  it('throws if no config exists', async () => {
    const dir = makeTempDir();
    await expect(check(dir)).rejects.toThrow('No envault config found');
  });

  it('throws if no environments configured', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig('test-project');
    config.environments = [];
    writeConfig(dir, config);
    await expect(check(dir)).rejects.toThrow('No environments configured');
  });

  it('returns inSync=true when both key and encrypted file exist', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig('proj-abc');
    config.environments = ['production'];
    writeConfig(dir, config);

    const encPath = getEncryptedPath(dir, 'production');
    fs.mkdirSync(path.dirname(encPath), { recursive: true });
    fs.writeFileSync(encPath, 'encrypted-data');

    writeKeys({ 'proj-abc': { production: 'somekey' } });

    const results = await check(dir);
    expect(results).toHaveLength(1);
    expect(results[0].environment).toBe('production');
    expect(results[0].hasEncryptedFile).toBe(true);
    expect(results[0].hasKey).toBe(true);
    expect(results[0].inSync).toBe(true);
  });

  it('returns inSync=false when key exists but no encrypted file', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig('proj-xyz');
    config.environments = ['staging'];
    writeConfig(dir, config);

    writeKeys({ 'proj-xyz': { staging: 'somekey' } });

    const results = await check(dir);
    expect(results[0].hasEncryptedFile).toBe(false);
    expect(results[0].hasKey).toBe(true);
    expect(results[0].inSync).toBe(false);
  });

  it('filters to a single environment when specified', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig('proj-multi');
    config.environments = ['dev', 'prod'];
    writeConfig(dir, config);
    writeKeys({});

    const results = await check(dir, 'dev');
    expect(results).toHaveLength(1);
    expect(results[0].environment).toBe('dev');
  });
});
