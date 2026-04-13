import * as fs from 'fs';
import * as path from 'path';
import { readConfig, writeConfig } from '../config/project';
import { readKeys, writeKeys } from '../crypto/keyfile';
import { getEncryptedPath } from '../crypto/envfile';

export interface CloneOptions {
  sourceEnv: string;
  targetEnv: string;
  projectDir?: string;
}

export async function cloneEnvironment(options: CloneOptions): Promise<void> {
  const projectDir = options.projectDir ?? process.cwd();
  const config = await readConfig(projectDir);

  if (!config.environments[options.sourceEnv]) {
    throw new Error(`Source environment "${options.sourceEnv}" does not exist.`);
  }

  if (config.environments[options.targetEnv]) {
    throw new Error(`Target environment "${options.targetEnv}" already exists.`);
  }

  // Copy encrypted file
  const sourcePath = getEncryptedPath(projectDir, options.sourceEnv);
  const targetPath = getEncryptedPath(projectDir, options.targetEnv);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Encrypted file for "${options.sourceEnv}" not found. Run 'lock' first.`);
  }

  fs.copyFileSync(sourcePath, targetPath);

  // Copy key entry
  const keys = await readKeys(projectDir);
  if (keys[options.sourceEnv]) {
    keys[options.targetEnv] = keys[options.sourceEnv];
    await writeKeys(projectDir, keys);
  }

  // Register new environment in config
  config.environments[options.targetEnv] = {
    ...config.environments[options.sourceEnv],
    createdAt: new Date().toISOString(),
  };

  await writeConfig(projectDir, config);
}
