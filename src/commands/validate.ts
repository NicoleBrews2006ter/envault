import * as fs from 'fs';
import * as path from 'path';
import { readConfig, configExists } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { getEncryptedPath } from '../crypto/envfile';

export interface ValidationResult {
  environment: string;
  hasKey: boolean;
  hasEncryptedFile: boolean;
  encryptedFilePath: string;
  valid: boolean;
}

export interface ValidateOptions {
  projectDir?: string;
}

export async function validateEnvironments(
  options: ValidateOptions = {}
): Promise<ValidationResult[]> {
  const projectDir = options.projectDir ?? process.cwd();

  if (!configExists(projectDir)) {
    throw new Error('No envault configuration found. Run `envault init` first.');
  }

  const config = readConfig(projectDir);
  const keys = readKeys();
  const results: ValidationResult[] = [];

  for (const environment of config.environments) {
    const encryptedFilePath = path.resolve(
      projectDir,
      getEncryptedPath(environment)
    );
    const hasKey = environment in keys;
    const hasEncryptedFile = fs.existsSync(encryptedFilePath);
    const valid = hasKey && hasEncryptedFile;

    results.push({
      environment,
      hasKey,
      hasEncryptedFile,
      encryptedFilePath,
      valid,
    });
  }

  return results;
}
