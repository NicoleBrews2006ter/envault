import * as fs from 'fs';
import * as path from 'path';
import { configExists, readConfig } from '../config/project';
import { decryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { readKeys } from '../crypto/keyfile';

export interface RedactResult {
  environment: string;
  redacted: number;
  output: string;
}

/**
 * Replace values of matched keys with a placeholder in the decrypted output.
 * The encrypted file is never modified — redaction only affects the printed output.
 */
export async function redact(
  projectDir: string,
  environment: string,
  keys: string[],
  placeholder = '***REDACTED***'
): Promise<RedactResult> {
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

  const storedKeys = readKeys(projectDir);
  const passphrase = storedKeys[environment];
  if (!passphrase) {
    throw new Error(`No key found for environment "${environment}". Run \`envault add\` first.`);
  }

  const plaintext = await decryptEnvFile(encryptedPath, passphrase);
  const matchSet = new Set(keys.map((k) => k.toUpperCase()));

  let redactedCount = 0;
  const lines = plaintext.split('\n').map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) return line;
    const eqIdx = line.indexOf('=');
    const key = line.slice(0, eqIdx).trim().toUpperCase();
    if (matchSet.has(key)) {
      redactedCount++;
      return `${line.slice(0, eqIdx + 1)}${placeholder}`;
    }
    return line;
  });

  return {
    environment,
    redacted: redactedCount,
    output: lines.join('\n'),
  };
}
