import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { renameKey } from './rename-key';
import { createDefaultConfig, writeConfig } from '../config/project';
import { writeKeys } from '../crypto/keyfile';
import { getEncryptedPath } from '../crypto/envfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-rename-key-'));
}

const PROJECT_ID = 'test-project';

async function setupProject(dir: string) {
  const config = createDefaultConfig(PROJECT_ID);
  await writeConfig(dir, config);
  await writeKeys({ [PROJECT_ID]: { production: 'abc123key' } });
  const encPath = getEncryptedPath(dir, 'production');
  fs.writeFileSync(encPath, 'encrypted-data');
}

describe('renameKey', () => {
  it('renames an environment key and file', async () => {
    const dir = makeTempDir();
    await setupProject(dir);

    await renameKey('production', 'prod', { projectDir: dir });

    const oldPath = getEncryptedPath(dir, 'production');
    const newPath = getEncryptedPath(dir, 'prod');

    expect(fs.existsSync(oldPath)).toBe(false);
    expect(fs.existsSync(newPath)).toBe(true);
    expect(fs.readFileSync(newPath, 'utf8')).toBe('encrypted-data');
  });

  it('throws if old environment does not exist', async () => {
    const dir = makeTempDir();
    await setupProject(dir);

    await expect(renameKey('staging', 'prod', { projectDir: dir })).rejects.toThrow(
      "Environment 'staging' does not exist."
    );
  });

  it('throws if new environment name already exists', async () => {
    const dir = makeTempDir();
    await setupProject(dir);
    await writeKeys({ [PROJECT_ID]: { production: 'abc123key', staging: 'xyz789key' } });
    const stagingPath = getEncryptedPath(dir, 'staging');
    fs.writeFileSync(stagingPath, 'other-data');

    await expect(renameKey('production', 'staging', { projectDir: dir })).rejects.toThrow(
      "Environment 'staging' already exists."
    );
  });

  it('throws if no keys found for project', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig(PROJECT_ID);
    await writeConfig(dir, config);
    await writeKeys({});

    await expect(renameKey('production', 'prod', { projectDir: dir })).rejects.toThrow(
      `No keys found for project '${PROJECT_ID}'.`
    );
  });
});
