import * as fs from 'fs';
import * as path from 'path';
import { configExists, readConfig } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { decryptEnvFile, encryptEnvFile, getEncryptedPath } from '../crypto/envfile';

export interface FlipResult {
  environment: string;
  from: string;
  to: string;
}

/**
 * "Flip" swaps the active environment by decrypting the target env and
 * re-encrypting the current working .env file under a new environment name,
 * effectively toggling between two environments in-place.
 */
export async function flip(
  projectDir: string,
  fromEnv: string,
  toEnv: string
): Promise<FlipResult> {
  if (!configExists(projectDir)) {
    throw new Error('No envault project found. Run `envault init` first.');
  }

  const config = readConfig(projectDir);
  const keys = readKeys();

  if (!config.environments.includes(fromEnv)) {
    throw new Error(`Environment "${fromEnv}" does not exist.`);
  }

  if (!config.environments.includes(toEnv)) {
    throw new Error(`Environment "${toEnv}" does not exist.`);
  }

  if (fromEnv === toEnv) {
    throw new Error('Source and target environments must be different.');
  }

  const fromKey = keys[`${config.name}:${fromEnv}`];
  if (!fromKey) {
    throw new Error(`No key found for environment "${fromEnv}". Run \`envault add ${fromEnv}\` first.`);
  }

  const toKey = keys[`${config.name}:${toEnv}`];
  if (!toKey) {
    throw new Error(`No key found for environment "${toEnv}". Run \`envault add ${toEnv}\` first.`);
  }

  const fromEncPath = getEncryptedPath(projectDir, fromEnv);
  const toEncPath = getEncryptedPath(projectDir, toEnv);

  if (!fs.existsSync(fromEncPath)) {
    throw new Error(`Encrypted file for "${fromEnv}" not found. Run \`envault lock ${fromEnv}\` first.`);
  }

  if (!fs.existsSync(toEncPath)) {
    throw new Error(`Encrypted file for "${toEnv}" not found. Run \`envault lock ${toEnv}\` first.`);
  }

  // Decrypt both environments into temp buffers
  const fromContents = await decryptEnvFile(fromEncPath, fromKey);
  const toContents = await decryptEnvFile(toEncPath, toKey);

  // Re-encrypt each under the other's path (swap)
  await encryptEnvFile(toContents, fromEncPath, fromKey);
  await encryptEnvFile(fromContents, toEncPath, toKey);

  return { environment: `${fromEnv} <-> ${toEnv}`, from: fromEnv, to: toEnv };
}
