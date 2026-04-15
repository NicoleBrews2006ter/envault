import * as fs from 'fs';
import * as path from 'path';
import { readConfig, configExists } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { getEncryptedPath } from '../crypto/envfile';

export interface CheckResult {
  environment: string;
  hasEncryptedFile: boolean;
  hasKey: boolean;
  inSync: boolean;
  encryptedPath: string;
}

export async function check(
  projectDir: string,
  environment?: string
): Promise<CheckResult[]> {
  if (!configExists(projectDir)) {
    throw new Error('No envault config found. Run `envault init` first.');
  }

  const config = readConfig(projectDir);
  const keys = readKeys();
  const projectKeys = keys[config.projectId] ?? {};

  const environments = environment
    ? [environment]
    : config.environments ?? [];

  if (environments.length === 0) {
    throw new Error('No environments configured. Use `envault add` to add one.');
  }

  const results: CheckResult[] = [];

  for (const env of environments) {
    const encryptedPath = getEncryptedPath(projectDir, env);
    const hasEncryptedFile = fs.existsSync(encryptedPath);
    const hasKey = Object.prototype.hasOwnProperty.call(projectKeys, env);

    let inSync = false;
    if (hasEncryptedFile && hasKey) {
      // Both exist — consider in sync
      inSync = true;
    } else if (!hasEncryptedFile && !hasKey) {
      // Neither exists — empty but consistent
      inSync = true;
    }

    results.push({
      environment: env,
      hasEncryptedFile,
      hasKey,
      inSync,
      encryptedPath: path.relative(projectDir, encryptedPath),
    });
  }

  return results;
}
