import * as fs from 'fs';
import * as path from 'path';
import { readConfig, writeConfig } from '../config/project';
import { getEncryptedPath } from '../crypto/envfile';

export interface RenameOptions {
  projectDir?: string;
}

export async function renameEnvironment(
  oldName: string,
  newName: string,
  options: RenameOptions = {}
): Promise<void> {
  const projectDir = options.projectDir ?? process.cwd();
  const config = await readConfig(projectDir);

  if (!config.environments[oldName]) {
    throw new Error(`Environment "${oldName}" does not exist.`);
  }

  if (config.environments[newName]) {
    throw new Error(`Environment "${newName}" already exists.`);
  }

  const oldEncryptedPath = getEncryptedPath(projectDir, oldName);
  const newEncryptedPath = getEncryptedPath(projectDir, newName);

  if (fs.existsSync(oldEncryptedPath)) {
    fs.renameSync(oldEncryptedPath, newEncryptedPath);
  }

  config.environments[newName] = {
    ...config.environments[oldName],
    name: newName,
  };
  delete config.environments[oldName];

  await writeConfig(projectDir, config);
}
