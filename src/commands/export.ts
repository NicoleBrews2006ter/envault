import * as fs from 'fs';
import * as path from 'path';
import { configExists, readConfig } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { decryptEnvFile, getEncryptedPath } from '../crypto/envfile';

export interface ExportOptions {
  environment: string;
  output?: string;
  projectDir?: string;
}

export async function exportEnv(options: ExportOptions): Promise<string> {
  const projectDir = options.projectDir ?? process.cwd();

  if (!configExists(projectDir)) {
    throw new Error('No envault project found. Run `envault init` first.');
  }

  const config = readConfig(projectDir);

  if (!config.environments.includes(options.environment)) {
    throw new Error(
      `Environment "${options.environment}" not found. Available: ${config.environments.join(', ')}`
    );
  }

  const encryptedPath = getEncryptedPath(projectDir, options.environment);

  if (!fs.existsSync(encryptedPath)) {
    throw new Error(
      `No encrypted file found for environment "${options.environment}". Run \`envault lock\` first.`
    );
  }

  const keys = readKeys();
  const keyEntry = keys[`${config.projectName}:${options.environment}`];

  if (!keyEntry) {
    throw new Error(
      `No key found for environment "${options.environment}". You may need to run \`envault unlock\` first.`
    );
  }

  const decrypted = await decryptEnvFile(encryptedPath, keyEntry.passphrase);

  const outputPath = options.output
    ? path.resolve(options.output)
    : path.join(projectDir, `.env.${options.environment}.export`);

  fs.writeFileSync(outputPath, decrypted, 'utf-8');

  return outputPath;
}
