import * as fs from 'fs';
import * as path from 'path';
import { readConfig, configExists } from '../config/project';
import { decryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { readKeys } from '../crypto/keyfile';

export interface ResolveResult {
  environment: string;
  key: string;
  value: string | null;
  found: boolean;
}

/**
 * Resolve the value of a specific key from a (possibly encrypted) env environment.
 * If the environment file is encrypted, it will be decrypted in-memory to find the key.
 */
export async function resolve(
  projectDir: string,
  environment: string,
  key: string
): Promise<ResolveResult> {
  if (!configExists(projectDir)) {
    throw new Error('No envault project found. Run `envault init` first.');
  }

  const config = readConfig(projectDir);
  if (!config.environments.includes(environment)) {
    throw new Error(`Environment "${environment}" does not exist.`);
  }

  // Try encrypted file first
  const encryptedPath = getEncryptedPath(projectDir, environment);
  if (fs.existsSync(encryptedPath)) {
    const keys = readKeys();
    const passphrase = keys[`${path.basename(projectDir)}:${environment}`];
    if (!passphrase) {
      throw new Error(
        `No key found for environment "${environment}". Run \`envault unlock ${environment}\` first.`
      );
    }
    const contents = await decryptEnvFile(encryptedPath, passphrase);
    const value = extractKey(contents, key);
    return { environment, key, value, found: value !== null };
  }

  // Fallback to plain .env file
  const plainPath = path.join(projectDir, `.env.${environment}`);
  if (fs.existsSync(plainPath)) {
    const contents = fs.readFileSync(plainPath, 'utf-8');
    const value = extractKey(contents, key);
    return { environment, key, value, found: value !== null };
  }

  throw new Error(
    `No env file found for environment "${environment}". Run \`envault lock ${environment}\` or add one.`
  );
}

function extractKey(contents: string, key: string): string | null {
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eqIdx = trimmed.indexOf('=');
    const lineKey = trimmed.slice(0, eqIdx).trim();
    if (lineKey === key) {
      return trimmed.slice(eqIdx + 1).trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    }
  }
  return null;
}
