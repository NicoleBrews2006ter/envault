import * as fs from 'fs';
import * as path from 'path';
import { configExists, readConfig } from '../config/project';
import { decryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { readKeys } from '../crypto/keyfile';

export interface UniqueResult {
  environment: string;
  duplicateKeys: string[];
  totalKeys: number;
}

export async function unique(
  projectDir: string,
  environment: string
): Promise<UniqueResult> {
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

  const keys = readKeys(projectDir);
  const passphrase = keys[environment];

  if (!passphrase) {
    throw new Error(
      `No key found for environment "${environment}". Run \`envault add ${environment}\` first.`
    );
  }

  const contents = await decryptEnvFile(encryptedPath, passphrase);
  const lines = contents.split('\n').filter((l) => l.trim() !== '' && !l.trim().startsWith('#'));

  const seen = new Set<string>();
  const duplicateKeys: string[] = [];

  for (const line of lines) {
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.substring(0, eqIndex).trim();
    if (!key) continue;
    if (seen.has(key)) {
      if (!duplicateKeys.includes(key)) {
        duplicateKeys.push(key);
      }
    } else {
      seen.add(key);
    }
  }

  return {
    environment,
    duplicateKeys,
    totalKeys: seen.size,
  };
}
