import * as fs from 'fs';
import * as path from 'path';
import { configExists, readConfig } from '../config/project';
import { decryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { readKeys } from '../crypto/keyfile';

export interface HeadOptions {
  lines?: number;
  decrypt?: boolean;
}

export async function head(
  projectRoot: string,
  environment: string,
  options: HeadOptions = {}
): Promise<string[]> {
  const { lines = 10, decrypt = false } = options;

  if (!configExists(projectRoot)) {
    throw new Error('No envault project found. Run `envault init` first.');
  }

  const config = readConfig(projectRoot);
  if (!config.environments.includes(environment)) {
    throw new Error(`Environment "${environment}" does not exist.`);
  }

  let content: string;

  if (decrypt) {
    const keys = readKeys();
    const key = keys[`${path.basename(projectRoot)}:${environment}`];
    if (!key) {
      throw new Error(`No key found for environment "${environment}". Run \`envault unlock\` first.`);
    }
    const encryptedPath = getEncryptedPath(projectRoot, environment);
    content = await decryptEnvFile(encryptedPath, key);
  } else {
    const encryptedPath = getEncryptedPath(projectRoot, environment);
    if (!fs.existsSync(encryptedPath)) {
      throw new Error(`Encrypted file not found for environment "${environment}".`);
    }
    content = fs.readFileSync(encryptedPath, 'utf-8');
  }

  const allLines = content.split('\n');
  return allLines.slice(0, lines);
}
