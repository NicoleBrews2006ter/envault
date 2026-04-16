import * as fs from 'fs';
import * as path from 'path';
import { configExists, readConfig } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { decryptEnvFile, getEncryptedPath } from '../crypto/envfile';

export interface GrepMatch {
  environment: string;
  key: string;
  value: string;
}

export async function grep(
  pattern: string,
  projectDir: string = process.cwd(),
  options: { keys?: boolean; values?: boolean } = {}
): Promise<GrepMatch[]> {
  if (!configExists(projectDir)) {
    throw new Error('No envault project found. Run `envault init` first.');
  }

  const config = readConfig(projectDir);
  const keys = readKeys();
  const matches: GrepMatch[] = {
    ...[] as GrepMatch[]
  } as unknown as GrepMatch[];
  const results: GrepMatch[] = [];

  const searchKeys = options.values === false || options.keys === true;
  const searchValues = options.keys === false || options.values !== false;
  const regex = new RegExp(pattern, 'i');

  for (const env of config.environments) {
    const encPath = getEncryptedPath(projectDir, env);
    if (!fs.existsSync(encPath)) continue;

    const keyEntry = keys.find((k) => k.environment === env && k.project === config.name);
    if (!keyEntry) continue;

    let contents: string;
    try {
      contents = await decryptEnvFile(encPath, keyEntry.passphrase);
    } catch {
      continue;
    }

    for (const line of contents.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;

      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();

      const keyMatch = searchKeys && regex.test(key);
      const valueMatch = searchValues && regex.test(value);

      if (keyMatch || valueMatch) {
        results.push({ environment: env, key, value });
      }
    }
  }

  return results;
}
