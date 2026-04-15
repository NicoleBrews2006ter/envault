import * as fs from 'fs';
import * as path from 'path';
import { configExists, readConfig } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { decryptEnvFile, getEncryptedPath } from '../crypto/envfile';

export interface BootstrapOptions {
  environment?: string;
  output?: string;
  force?: boolean;
}

export interface BootstrapResult {
  environment: string;
  outputPath: string;
  skipped: boolean;
}

/**
 * Bootstrap decrypts the specified environment (default: first available)
 * and writes the .env file, making it easy for new team members to get started.
 */
export async function bootstrap(
  projectDir: string,
  options: BootstrapOptions = {}
): Promise<BootstrapResult> {
  if (!configExists(projectDir)) {
    throw new Error('No envault project found. Run `envault init` first.');
  }

  const config = readConfig(projectDir);
  const environments = Object.keys(config.environments || {});

  if (environments.length === 0) {
    throw new Error('No environments configured. Run `envault add <env>` first.');
  }

  const environment = options.environment ?? environments[0];

  if (!config.environments[environment]) {
    throw new Error(`Environment "${environment}" not found. Available: ${environments.join(', ')}`);
  }

  const keys = readKeys();
  const projectKey = keys[config.id]?.[environment];

  if (!projectKey) {
    throw new Error(
      `No key found for environment "${environment}". Ask a team member to share access.`
    );
  }

  const encryptedPath = getEncryptedPath(projectDir, environment);

  if (!fs.existsSync(encryptedPath)) {
    throw new Error(
      `Encrypted file not found for "${environment}". Run \`envault lock ${environment}\` first.`
    );
  }

  const outputPath = options.output ?? path.join(projectDir, '.env');

  if (fs.existsSync(outputPath) && !options.force) {
    return { environment, outputPath, skipped: true };
  }

  await decryptEnvFile(encryptedPath, outputPath, projectKey);

  return { environment, outputPath, skipped: false };
}
