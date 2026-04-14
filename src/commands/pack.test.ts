import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { pack } from './pack';
import { createDefaultConfig, writeConfig } from '../config/project';
import { writeKeys } from '../crypto/keyfile';
import { getEncryptedPath } from '../crypto/envfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-pack-test-'));
}

describe('pack', () => {
  it('throws if no config exists', async () => {
    const dir = makeTempDir();
    await expect(pack(dir)).rejects.toThrow('No envault project found');
  });

  it('throws if no environments exist', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig('myproject');
    writeConfig(dir, config);
    await expect(pack(dir)).rejects.toThrow('No environments found');
  });

  it('creates a bundle file with encrypted env contents', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig('myproject');
    config.environments['production'] = { createdAt: new Date().toISOString() };
    writeConfig(dir, config);

    const encPath = getEncryptedPath(dir, 'production');
    fs.writeFileSync(encPath, JSON.stringify({ iv: 'abc', data: 'xyz' }));

    const result = await pack(dir);
    expect(result.environments).toContain('production');
    expect(fs.existsSync(result.outputPath)).toBe(true);

    const bundle = JSON.parse(fs.readFileSync(result.outputPath, 'utf8'));
    expect(bundle.project).toBe('myproject');
    expect(bundle.environments['production']).toBeDefined();
    expect(bundle.keys).toBeUndefined();
  });

  it('includes keys when includeKeys is true', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig('myproject');
    config.environments['staging'] = { createdAt: new Date().toISOString() };
    writeConfig(dir, config);

    const encPath = getEncryptedPath(dir, 'staging');
    fs.writeFileSync(encPath, JSON.stringify({ iv: 'def', data: 'uvw' }));
    writeKeys(dir, { staging: 'supersecretkey' });

    const result = await pack(dir, undefined, true);
    expect(result.includedKeys).toBe(true);

    const bundle = JSON.parse(fs.readFileSync(result.outputPath, 'utf8'));
    expect(bundle.keys).toBeDefined();
    expect(bundle.keys['staging']).toBe('supersecretkey');
  });

  it('writes bundle to custom output path', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig('myproject');
    config.environments['dev'] = { createdAt: new Date().toISOString() };
    writeConfig(dir, config);

    const encPath = getEncryptedPath(dir, 'dev');
    fs.writeFileSync(encPath, JSON.stringify({ iv: 'ghi', data: 'rst' }));

    const outPath = path.join(dir, 'my-bundle.json');
    const result = await pack(dir, outPath);
    expect(result.outputPath).toBe(outPath);
    expect(fs.existsSync(outPath)).toBe(true);
  });
});
