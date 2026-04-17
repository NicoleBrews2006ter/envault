import * as fs from 'fs';
import * as path from 'path';
import { readConfig, configExists } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { decryptEnvFile, getEncryptedPath } from '../crypto/envfile';

export interface CatOptions {
  environment: string;
  projectDir?: string;
}

export async function cat(options: CatOptions): Promise<string> {
  const projectDir = options.projectDir ?? process.cwd();

  if (!configExists(projectDir)) {
    throw new Error('No envault project found. Run `envault init` first.');
  }

  const config = readConfig(projectDir);
  const env = options.environment;

  if (!config.environments.includes(env)) {
    throw new Error(`Environment "${env}" does not exist.`);
  }

  const encryptedPath = getEncryptedPath(projectDir, env);
  if (!fs.existsSync(encryptedPath)) {
    throw new Error(`No encrypted file found for environment "${env}".`);
  }

  const keys = readKeys();
  const projectName = config.name;
  const key = keys[projectName]?.[env];

  if (!key) {
    throw new Error(`No key found for environment "${env}". Run \`envault add ${env}\` or \`envault unlock ${env}\`.`);
  }

  const contents = decryptEnvFile(encryptedPath, key);
  return contents;
}
