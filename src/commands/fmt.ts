import * as fs from 'fs';
import * as path from 'path';
import { configExists, readConfig } from '../config/project';
import { decryptEnvFile, getEncryptedPath, encryptEnvFile } from '../crypto/envfile';
import { readKeys } from '../crypto/keyfile';

export interface FmtOptions {
  env?: string;
  check?: boolean;
}

export function formatEnvContents(contents: string): string {
  const lines = contents.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trimEnd();
    // Skip duplicate blank lines
    if (trimmed === '' && result.length > 0 && result[result.length - 1] === '') {
      continue;
    }
    result.push(trimmed);
  }

  // Remove leading blank lines
  while (result.length > 0 && result[0] === '') result.shift();
  // Ensure single trailing newline
  while (result.length > 0 && result[result.length - 1] === '') result.pop();

  return result.join('\n') + '\n';
}

export async function fmt(cwd: string, options: FmtOptions = {}): Promise<{ formatted: boolean; env: string }> {
  if (!configExists(cwd)) throw new Error('No envault project found. Run `envault init` first.');

  const config = readConfig(cwd);
  const env = options.env ?? config.defaultEnv ?? 'development';

  const encryptedPath = getEncryptedPath(cwd, env);
  if (!fs.existsSync(encryptedPath)) throw new Error(`Environment "${env}" not found.`);

  const keys = readKeys();
  const passphrase = keys[config.projectId]?.[env];
  if (!passphrase) throw new Error(`No key found for environment "${env}".`);

  const decrypted = await decryptEnvFile(encryptedPath, passphrase);
  const formatted = formatEnvContents(decrypted);

  if (options.check) {
    return { formatted: decrypted !== formatted, env };
  }

  if (decrypted !== formatted) {
    await encryptEnvFile(formatted, encryptedPath, passphrase);
    return { formatted: true, env };
  }

  return { formatted: false, env };
}
