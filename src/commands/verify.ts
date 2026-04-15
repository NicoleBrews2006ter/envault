import * as fs from 'fs';
import * as path from 'path';
import { readConfig, configExists } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { getEncryptedPath, decryptEnvFile } from '../crypto/envfile';

export interface VerifyResult {
  environment: string;
  encryptedFileExists: boolean;
  keyExists: boolean;
  decryptable: boolean;
  error?: string;
}

export async function verify(
  projectDir: string,
  environment?: string
): Promise<VerifyResult[]> {
  if (!configExists(projectDir)) {
    throw new Error('No envault config found. Run `envault init` first.');
  }

  const config = readConfig(projectDir);
  const keys = readKeys();
  const results: VerifyResult[] = [];

  const environments = environment
    ? [environment]
    : config.environments;

  for (const env of environments) {
    const encryptedPath = getEncryptedPath(projectDir, env);
    const encryptedFileExists = fs.existsSync(encryptedPath);
    const keyEntry = keys[`${config.project}:${env}`];
    const keyExists = !!keyEntry;

    let decryptable = false;
    let error: string | undefined;

    if (encryptedFileExists && keyExists) {
      try {
        await decryptEnvFile(projectDir, env, keyEntry.passphrase);
        decryptable = true;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }
    } else if (!encryptedFileExists) {
      error = 'Encrypted file not found';
    } else {
      error = 'No key found for this environment';
    }

    results.push({ environment: env, encryptedFileExists, keyExists, decryptable, error });
  }

  return results;
}
