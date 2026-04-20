import * as fs from 'fs';
import * as path from 'path';
import { configExists, readConfig } from '../config/project';
import { decryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { readKeys } from '../crypto/keyfile';

export interface CountResult {
  environment: string;
  total: number;
  commented: number;
  empty: number;
  active: number;
}

export async function count(
  projectDir: string,
  environment: string
): Promise<CountResult> {
  if (!configExists(projectDir)) {
    throw new Error('No envault project found. Run `envault init` first.');
  }

  const config = readConfig(projectDir);
  if (!config.environments.includes(environment)) {
    throw new Error(`Environment "${environment}" does not exist.`);
  }

  const encryptedPath = getEncryptedPath(projectDir, environment);
  if (!fs.existsSync(encryptedPath)) {
    throw new Error(`No encrypted file found for environment "${environment}".`);
  }

  const keys = readKeys();
  const projectKey = keys[config.projectId]?.[environment];
  if (!projectKey) {
    throw new Error(`No key found for environment "${environment}". Run \`envault add ${environment}\` first.`);
  }

  const contents = await decryptEnvFile(encryptedPath, projectKey);
  const lines = contents.split('\n');

  let commented = 0;
  let empty = 0;
  let active = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      empty++;
    } else if (trimmed.startsWith('#')) {
      commented++;
    } else if (trimmed.includes('=')) {
      active++;
    }
  }

  return {
    environment,
    total: active + commented + empty,
    commented,
    empty,
    active,
  };
}
