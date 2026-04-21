import * as fs from 'fs';
import * as path from 'path';
import { configExists, readConfig } from '../config/project';
import { decryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { readKeys } from '../crypto/keyfile';

export interface MaskResult {
  environment: string;
  maskedCount: number;
  lines: string[];
}

export function maskValue(value: string, reveal: number = 0): string {
  if (value.length === 0) return '';
  if (reveal <= 0) return '*'.repeat(Math.min(value.length, 8));
  const visible = value.slice(-reveal);
  const hidden = '*'.repeat(Math.max(value.length - reveal, 3));
  return hidden + visible;
}

export function maskEnvContents(contents: string, reveal: number = 0): string[] {
  return contents.split('\n').map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) return line;
    const key = line.slice(0, eqIndex);
    const value = line.slice(eqIndex + 1).replace(/^["']|["']$/g, '');
    const masked = maskValue(value, reveal);
    return `${key}=${masked}`;
  });
}

export async function mask(
  projectDir: string,
  environment: string,
  reveal: number = 0
): Promise<MaskResult> {
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
  const projectKey = keys[config.projectId];
  if (!projectKey) {
    throw new Error('No key found for this project. Run `envault add` to add a key.');
  }

  const contents = await decryptEnvFile(encryptedPath, projectKey);
  const lines = maskEnvContents(contents, reveal);
  const maskedCount = lines.filter((l) => l.includes('=') && !l.trim().startsWith('#')).length;

  return { environment, maskedCount, lines };
}
