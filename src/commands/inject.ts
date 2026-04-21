import * as fs from 'fs';
import * as path from 'path';
import { configExists, readConfig } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { decryptEnvFile, getEncryptedPath } from '../crypto/envfile';

export interface InjectResult {
  environment: string;
  injected: number;
  command: string;
}

/**
 * Decrypts the given environment and spawns a child process with the
 * env vars injected — without writing a plaintext file to disk.
 */
export async function inject(
  projectDir: string,
  environment: string,
  commandArgs: string[]
): Promise<InjectResult> {
  if (!configExists(projectDir)) {
    throw new Error('No envault project found. Run `envault init` first.');
  }

  const config = readConfig(projectDir);

  if (!config.environments.includes(environment)) {
    throw new Error(`Environment "${environment}" does not exist.`);
  }

  const encryptedPath = getEncryptedPath(projectDir, environment);
  if (!fs.existsSync(encryptedPath)) {
    throw new Error(`No encrypted file found for environment "${environment}". Run \`envault lock ${environment}\` first.`);
  }

  const keys = readKeys();
  const keyEntry = keys[`${path.resolve(projectDir)}:${environment}`];
  if (!keyEntry) {
    throw new Error(`No key found for environment "${environment}". Run \`envault add ${environment}\` first.`);
  }

  const plaintext = await decryptEnvFile(encryptedPath, keyEntry.passphrase);

  const envVars: Record<string, string> = {};
  for (const line of plaintext.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    envVars[key] = value;
  }

  const { spawnSync } = await import('child_process');
  const result = spawnSync(commandArgs[0], commandArgs.slice(1), {
    env: { ...process.env, ...envVars },
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  process.exitCode = result.status ?? 0;

  return { environment, injected: Object.keys(envVars).length, command: commandArgs.join(' ') };
}
