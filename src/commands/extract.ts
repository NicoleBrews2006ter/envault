import * as fs from 'fs';
import * as path from 'path';
import { configExists, readConfig } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { decryptEnvFile, getEncryptedPath } from '../crypto/envfile';

export interface ExtractResult {
  keys: string[];
  environment: string;
  outputFile: string;
}

/**
 * Extracts only the specified keys from an environment and writes them to a file.
 */
export async function extract(
  environment: string,
  keys: string[],
  outputFile: string,
  cwd: string = process.cwd()
): Promise<ExtractResult> {
  if (!configExists(cwd)) {
    throw new Error('No envault project found. Run `envault init` first.');
  }

  const config = readConfig(cwd);

  if (!config.environments.includes(environment)) {
    throw new Error(`Environment "${environment}" does not exist.`);
  }

  const encryptedPath = getEncryptedPath(cwd, environment);
  if (!fs.existsSync(encryptedPath)) {
    throw new Error(`No encrypted file found for environment "${environment}". Run \`envault lock ${environment}\` first.`);
  }

  const storedKeys = readKeys(cwd);
  const passphrase = storedKeys[environment];
  if (!passphrase) {
    throw new Error(`No key found for environment "${environment}". Run \`envault unlock ${environment}\` first.`);
  }

  const decrypted = await decryptEnvFile(encryptedPath, passphrase);

  const lines = decrypted.split('\n');
  const extracted: string[] = [];
  const foundKeys: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    if (keys.includes(key)) {
      extracted.push(line);
      foundKeys.push(key);
    }
  }

  const missing = keys.filter(k => !foundKeys.includes(k));
  if (missing.length > 0) {
    throw new Error(`Keys not found in environment "${environment}": ${missing.join(', ')}`);
  }

  const outputDir = path.dirname(outputFile);
  if (outputDir && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, extracted.join('\n') + '\n', 'utf-8');

  return { keys: foundKeys, environment, outputFile };
}
