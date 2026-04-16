import * as path from 'path';
import { readConfig } from '../config/project';
import { readKeys, writeKeys } from '../crypto/keyfile';
import { encryptEnvFile, decryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import * as fs from 'fs';

export interface RenameKeyOptions {
  projectDir?: string;
}

export async function renameKey(
  oldName: string,
  newName: string,
  options: RenameKeyOptions = {}
): Promise<void> {
  const projectDir = options.projectDir ?? process.cwd();
  const config = await readConfig(projectDir);

  const keys = await readKeys();
  const projectKeys = keys[config.projectId];

  if (!projectKeys) {
    throw new Error(`No keys found for project '${config.projectId}'.`);
  }

  if (!projectKeys[oldName]) {
    throw new Error(`Environment '${oldName}' does not exist.`);
  }

  if (projectKeys[newName]) {
    throw new Error(`Environment '${newName}' already exists.`);
  }

  const oldEncryptedPath = getEncryptedPath(projectDir, oldName);
  const newEncryptedPath = getEncryptedPath(projectDir, newName);

  if (!fs.existsSync(oldEncryptedPath)) {
    throw new Error(`Encrypted file for '${oldName}' not found.`);
  }

  // Move the encrypted file
  fs.renameSync(oldEncryptedPath, newEncryptedPath);

  // Update keys: copy old key to new name, delete old
  projectKeys[newName] = projectKeys[oldName];
  delete projectKeys[oldName];
  keys[config.projectId] = projectKeys;

  await writeKeys(keys);
}
