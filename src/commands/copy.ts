import * as fs from 'fs';
import * as path from 'path';
import { readConfig, configExists } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { decryptEnvFile, encryptEnvFile, getEncryptedPath } from '../crypto/envfile';

export interface CopyOptions {
  projectDir?: string;
}

export async function copyEnvironment(
  sourceEnv: string,
  targetEnv: string,
  options: CopyOptions = {}
): Promise<void> {
  const projectDir = options.projectDir ?? process.cwd();

  if (!configExists(projectDir)) {
    throw new Error('No envault project found. Run `envault init` first.');
  }

  const config = readConfig(projectDir);

  if (!config.environments[sourceEnv]) {
    throw new Error(`Source environment "${sourceEnv}" does not exist.`);
  }

  if (config.environments[targetEnv]) {
    throw new Error(`Target environment "${targetEnv}" already exists. Remove it first.`);
  }

  const keys = readKeys();
  const projectKeys = keys[config.projectId];

  if (!projectKeys?.[sourceEnv]) {
    throw new Error(`No key found for environment "${sourceEnv}". Run \`envault unlock ${sourceEnv}\` first.`);
  }

  const sourceEncryptedPath = getEncryptedPath(projectDir, sourceEnv);
  if (!fs.existsSync(sourceEncryptedPath)) {
    throw new Error(`Encrypted file for "${sourceEnv}" not found. Run \`envault lock ${sourceEnv}\` first.`);
  }

  const sourceKey = projectKeys[sourceEnv];
  const decrypted = await decryptEnvFile(sourceEncryptedPath, sourceKey);

  const targetEncryptedPath = getEncryptedPath(projectDir, targetEnv);
  const targetKey = sourceKey;

  await encryptEnvFile(decrypted, targetEncryptedPath, targetKey);

  config.environments[targetEnv] = {
    ...config.environments[sourceEnv],
    createdAt: new Date().toISOString(),
  };

  const { writeConfig } = await import('../config/project');
  writeConfig(projectDir, config);

  const { writeKeys } = await import('../crypto/keyfile');
  keys[config.projectId] = { ...projectKeys, [targetEnv]: targetKey };
  writeKeys(keys);
}
