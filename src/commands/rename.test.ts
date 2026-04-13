import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { renameEnvironment } from './rename';
import { writeConfig, readConfig } from '../config/project';
import { createDefaultConfig } from '../config/project';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-rename-test-'));
}

describe('renameEnvironment', () => {
  it('renames an existing environment in config', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig();
    config.environments['staging'] = { name: 'staging', createdAt: new Date().toISOString() };
    await writeConfig(dir, config);

    await renameEnvironment('staging', 'uat', { projectDir: dir });

    const updated = await readConfig(dir);
    expect(updated.environments['uat']).toBeDefined();
    expect(updated.environments['staging']).toBeUndefined();
  });

  it('throws if old environment does not exist', async () => {
    const dir = makeTempDir();
    await writeConfig(dir, createDefaultConfig());

    await expect(
      renameEnvironment('nonexistent', 'new', { projectDir: dir })
    ).rejects.toThrow('does not exist');
  });

  it('throws if new environment name already exists', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig();
    config.environments['staging'] = { name: 'staging', createdAt: new Date().toISOString() };
    config.environments['uat'] = { name: 'uat', createdAt: new Date().toISOString() };
    await writeConfig(dir, config);

    await expect(
      renameEnvironment('staging', 'uat', { projectDir: dir })
    ).rejects.toThrow('already exists');
  });

  it('renames the encrypted file if it exists', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig();
    config.environments['staging'] = { name: 'staging', createdAt: new Date().toISOString() };
    await writeConfig(dir, config);

    const envaultDir = path.join(dir, '.envault');
    fs.mkdirSync(envaultDir, { recursive: true });
    const oldFile = path.join(envaultDir, 'staging.env.enc');
    fs.writeFileSync(oldFile, 'encrypted-data');

    await renameEnvironment('staging', 'uat', { projectDir: dir });

    expect(fs.existsSync(path.join(envaultDir, 'uat.env.enc'))).toBe(true);
    expect(fs.existsSync(oldFile)).toBe(false);
  });
});
