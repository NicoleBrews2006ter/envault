import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { cloneEnvironment } from './clone';
import { writeConfig, readConfig } from '../config/project';
import { writeKeys, readKeys } from '../crypto/keyfile';
import { getEncryptedPath } from '../crypto/envfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-clone-test-'));
}

const baseConfig = {
  version: 1,
  environments: {
    production: { createdAt: '2024-01-01T00:00:00.000Z' },
  },
};

describe('cloneEnvironment', () => {
  it('clones an environment and its encrypted file', async () => {
    const dir = makeTempDir();
    await writeConfig(dir, baseConfig);
    await writeKeys(dir, { production: 'secret-key' });

    const srcPath = getEncryptedPath(dir, 'production');
    fs.mkdirSync(path.dirname(srcPath), { recursive: true });
    fs.writeFileSync(srcPath, 'encrypted-data');

    await cloneEnvironment({ sourceEnv: 'production', targetEnv: 'staging', projectDir: dir });

    const targetPath = getEncryptedPath(dir, 'staging');
    expect(fs.existsSync(targetPath)).toBe(true);
    expect(fs.readFileSync(targetPath, 'utf8')).toBe('encrypted-data');

    const config = await readConfig(dir);
    expect(config.environments['staging']).toBeDefined();

    const keys = await readKeys(dir);
    expect(keys['staging']).toBe('secret-key');
  });

  it('throws if source environment does not exist', async () => {
    const dir = makeTempDir();
    await writeConfig(dir, { version: 1, environments: {} });

    await expect(
      cloneEnvironment({ sourceEnv: 'ghost', targetEnv: 'staging', projectDir: dir })
    ).rejects.toThrow('Source environment "ghost" does not exist.');
  });

  it('throws if target environment already exists', async () => {
    const dir = makeTempDir();
    await writeConfig(dir, baseConfig);

    await expect(
      cloneEnvironment({ sourceEnv: 'production', targetEnv: 'production', projectDir: dir })
    ).rejects.toThrow('Target environment "production" already exists.');
  });

  it('throws if encrypted source file is missing', async () => {
    const dir = makeTempDir();
    await writeConfig(dir, baseConfig);
    await writeKeys(dir, {});

    await expect(
      cloneEnvironment({ sourceEnv: 'production', targetEnv: 'staging', projectDir: dir })
    ).rejects.toThrow('Encrypted file for "production" not found.');
  });
});
