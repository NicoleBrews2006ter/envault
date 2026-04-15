import * as fs from 'fs';
import * as path from 'path';
import { readConfig, configExists } from '../config/project';
import { getEncryptedPath } from '../crypto/envfile';

export interface CleanResult {
  removed: string[];
  skipped: string[];
  errors: string[];
}

/**
 * Removes decrypted .env files for environments that have an encrypted counterpart.
 * Helps ensure plaintext secrets are not left on disk after unlocking.
 */
export async function clean(
  projectDir: string,
  environments?: string[],
  dryRun = false
): Promise<CleanResult> {
  if (!configExists(projectDir)) {
    throw new Error('No envault project found. Run `envault init` first.');
  }

  const config = readConfig(projectDir);
  const envNames = environments && environments.length > 0
    ? environments
    : config.environments;

  const result: CleanResult = { removed: [], skipped: [], errors: [] };

  for (const env of envNames) {
    if (!config.environments.includes(env)) {
      result.errors.push(`Environment "${env}" not found in project.`);
      continue;
    }

    const encryptedPath = getEncryptedPath(projectDir, env);
    if (!fs.existsSync(encryptedPath)) {
      result.skipped.push(env);
      continue;
    }

    const decryptedPath = path.join(projectDir, `.env.${env}`);
    if (!fs.existsSync(decryptedPath)) {
      result.skipped.push(env);
      continue;
    }

    if (!dryRun) {
      try {
        fs.unlinkSync(decryptedPath);
      } catch (err: any) {
        result.errors.push(`Failed to remove ${decryptedPath}: ${err.message}`);
        continue;
      }
    }

    result.removed.push(env);
  }

  return result;
}
