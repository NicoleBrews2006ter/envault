import * as fs from 'fs';
import * as path from 'path';
import { configExists, readConfig } from '../config/project';
import { decryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { readKeys } from '../crypto/keyfile';

export interface TailOptions {
  lines?: number;
  raw?: boolean;
}

export async function tail(
  environment: string,
  projectDir: string = process.cwd(),
  options: TailOptions = {}
): Promise<string[]> {
  if (!configExists(projectDir)) {
    throw new Error('No envault project found. Run `envault init` first.');
  }

  const config = readConfig(projectDir);
  if (!config.environments.includes(environment)) {
    throw new Error(`Environment "${environment}" does not exist.`);
  }

  const encryptedPath = getEncryptedPath(projectDir, environment);
  if (!fs.existsSync(encryptedPath)) {
    throw new Error(`No encrypted file found for environment "${environment}".`);
  }

  const keys = readKeys();
  const projectKey = keys[config.projectId]?.[environment];
  if (!projectKey) {
    throw new Error(`No key found for environment "${environment}". Use \`envault add\` or \`envault unlock\`.`);
  }

  const decrypted = await decryptEnvFile(encryptedPath, projectKey);
  const allLines = decrypted.split('\n').filter(l => l.trim() !== '');
  const n = options.lines ?? 10;
  const result = allLines.slice(-n);

  if (!options.raw) {
    return result.map(line => {
      if (line.startsWith('#')) return line;
      const [key] = line.split('=');
      return key ? `${key}=***` : line;
    });
  }

  return result;
}
