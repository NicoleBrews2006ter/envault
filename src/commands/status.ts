import * as fs from 'fs';
import * as path from 'path';
import { configExists, readConfig } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { getEncryptedPath } from '../crypto/envfile';

export interface StatusResult {
  initialized: boolean;
  environments: EnvironmentStatus[];
}

export interface EnvironmentStatus {
  name: string;
  hasKey: boolean;
  isLocked: boolean;
  envFileExists: boolean;
  encryptedFileExists: boolean;
}

export async function statusCommand(cwd: string = process.cwd()): Promise<StatusResult> {
  if (!configExists(cwd)) {
    return { initialized: false, environments: [] };
  }

  const config = readConfig(cwd);
  const keys = readKeys();
  const environments: EnvironmentStatus[] = [];

  for (const env of config.environments) {
    const keyEntry = keys[`${config.projectId}:${env}`];
    const envFilePath = path.join(cwd, `.env.${env}`);
    const encryptedPath = getEncryptedPath(cwd, env);

    const envFileExists = fs.existsSync(envFilePath);
    const encryptedFileExists = fs.existsSync(encryptedPath);
    const hasKey = !!keyEntry;
    const isLocked = !envFileExists && encryptedFileExists;

    environments.push({
      name: env,
      hasKey,
      isLocked,
      envFileExists,
      encryptedFileExists,
    });
  }

  return { initialized: true, environments };
}
