import * as fs from 'fs';
import * as path from 'path';
import { configExists, readConfig } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { decryptEnvFile, getEncryptedPath } from '../crypto/envfile';

export interface UnlockOptions {
  environment?: string;
  projectDir?: string;
}

export interface UnlockResult {
  success: boolean;
  message: string;
  outputPath?: string;
}

/**
 * Resolves the output .env file path for a given environment.
 * - 'default' environment maps to `.env`
 * - named environments map to `.env.<environment>`
 */
function getOutputPath(projectDir: string, environment: string): string {
  const filename = environment === 'default' ? '.env' : `.env.${environment}`;
  return path.join(projectDir, filename);
}

export async function unlockEnv(options: UnlockOptions = {}): Promise<UnlockResult> {
  const projectDir = options.projectDir ?? process.cwd();
  const environment = options.environment ?? 'default';

  if (!configExists(projectDir)) {
    return {
      success: false,
      message: 'No envault config found. Run `envault init` first.',
    };
  }

  const config = readConfig(projectDir);
  const keys = readKeys();

  const projectKey = keys[config.projectId];
  if (!projectKey) {
    return {
      success: false,
      message: `No key found for project "${config.projectId}". You may need to run \`envault add\` or obtain the key from a teammate.`,
    };
  }

  const encryptedPath = getEncryptedPath(projectDir, environment);
  if (!fs.existsSync(encryptedPath)) {
    return {
      success: false,
      message: `No encrypted env file found for environment "${environment}". Expected: ${encryptedPath}`,
    };
  }

  const outputPath = getOutputPath(projectDir, environment);

  try {
    await decryptEnvFile(encryptedPath, outputPath, projectKey);
    return {
      success: true,
      message: `Environment "${environment}" unlocked successfully to ${outputPath}`,
      outputPath,
    };
  } catch (err) {
    return {
      success: false,
      message: `Failed to decrypt: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
