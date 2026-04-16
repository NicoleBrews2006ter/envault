import * as fs from 'fs';
import * as path from 'path';
import { configExists, readConfig } from '../config/project';
import { decryptEnvFile, encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { readKeys } from '../crypto/keyfile';

export async function renameKey(
  environment: string,
  oldKey: string,
  newKey: string,
  cwd: string = process.cwd()
): Promise<void> {
  if (!configExists(cwd)) {
    throw new Error('No envault project found. Run `envault init` first.');
  }

  const config = readConfig(cwd);
  if (!config.environments.includes(environment)) {
    throw new Error(`Environment "${environment}" does not exist.`);
  }

  const keys = readKeys();
  const projectKey = keys[config.name]?.[environment];
  if (!projectKey) {
    throw new Error(`No key found for environment "${environment}".`);
  }

  const encryptedPath = getEncryptedPath(cwd, environment);
  if (!fs.existsSync(encryptedPath)) {
    throw new Error(`Encrypted file not found for environment "${environment}".`);
  }

  const contents = await decryptEnvFile(encryptedPath, projectKey);
  const lines = contents.split('\n');
  let found = false;

  const updated = lines.map((line) => {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (match && match[1].trim() === oldKey) {
      found = true;
      return `${newKey}=${match[2]}`;
    }
    return line;
  });

  if (!found) {
    throw new Error(`Key "${oldKey}" not found in environment "${environment}".`);
  }

  await encryptEnvFile(updated.join('\n'), encryptedPath, projectKey);
  console.log(`Renamed key "${oldKey}" to "${newKey}" in environment "${environment}".`);
}
