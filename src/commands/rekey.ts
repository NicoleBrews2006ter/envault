import * as fs from 'fs';
import * as path from 'path';
import { readConfig } from '../config/project';
import { readKeys, storeKey, generatePassphrase } from '../crypto/keyfile';
import { decryptEnvFile, encryptEnvFile, getEncryptedPath } from '../crypto/envfile';

export interface RekeyOptions {
  environment: string;
  projectDir?: string;
  newPassphrase?: string;
}

export interface RekeyResult {
  environment: string;
  oldFingerprint: string;
  newFingerprint: string;
  encryptedPath: string;
}

export async function rekey(options: RekeyOptions): Promise<RekeyResult> {
  const projectDir = options.projectDir ?? process.cwd();
  const config = readConfig(projectDir);

  if (!config.environments.includes(options.environment)) {
    throw new Error(`Environment "${options.environment}" not found in project config`);
  }

  const keys = readKeys();
  const projectKeys = keys[config.name] ?? {};
  const oldPassphrase = projectKeys[options.environment];

  if (!oldPassphrase) {
    throw new Error(`No key found for environment "${options.environment}"`);
  }

  const encryptedPath = getEncryptedPath(projectDir, options.environment);
  if (!fs.existsSync(encryptedPath)) {
    throw new Error(`Encrypted file not found: ${encryptedPath}`);
  }

  // Decrypt with old passphrase
  const plaintext = await decryptEnvFile(encryptedPath, oldPassphrase);

  // Generate or use provided new passphrase
  const newPassphrase = options.newPassphrase ?? generatePassphrase();

  // Re-encrypt with new passphrase
  const tempEnvPath = path.join(projectDir, `.env.${options.environment}.rekey-tmp`);
  fs.writeFileSync(tempEnvPath, plaintext, 'utf8');

  try {
    await encryptEnvFile(tempEnvPath, newPassphrase, encryptedPath);
  } finally {
    if (fs.existsSync(tempEnvPath)) {
      fs.unlinkSync(tempEnvPath);
    }
  }

  // Store new key
  storeKey(config.name, options.environment, newPassphrase);

  const oldFingerprint = Buffer.from(oldPassphrase).toString('base64').slice(0, 8);
  const newFingerprint = Buffer.from(newPassphrase).toString('base64').slice(0, 8);

  return {
    environment: options.environment,
    oldFingerprint,
    newFingerprint,
    encryptedPath,
  };
}
