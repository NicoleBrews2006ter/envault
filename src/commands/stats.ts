import * as fs from 'fs';
import * as path from 'path';
import { readConfig } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { getEncryptedPath, parseEnvContents, decryptEnvFile } from '../crypto/envfile';

export interface EnvStats {
  environment: string;
  keyCount: number;
  encryptedSize: number;
  lastModified: Date | null;
}

export interface StatsResult {
  project: string;
  environments: EnvStats[];
  totalKeys: number;
  totalSize: number;
}

export async function stats(cwd: string): Promise<StatsResult> {
  const config = await readConfig(cwd);
  const keys = await readKeys();
  const results: EnvStats[] = [];

  for (const env of config.environments) {
    const encPath = getEncryptedPath(cwd, env);
    let keyCount = 0;
    let encryptedSize = 0;
    let lastModified: Date | null = null;

    if (fs.existsSync(encPath)) {
      const fileStat = fs.statSync(encPath);
      encryptedSize = fileStat.size;
      lastModified = fileStat.mtime;

      const passphrase = keys[`${config.project}:${env}`];
      if (passphrase) {
        try {
          const contents = await decryptEnvFile(cwd, env, passphrase);
          const parsed = parseEnvContents(contents);
          keyCount = Object.keys(parsed).length;
        } catch {
          // unable to decrypt
        }
      }
    }

    results.push({ environment: env, keyCount, encryptedSize, lastModified });
  }

  return {
    project: config.project,
    environments: results,
    totalKeys: results.reduce((s, r) => s + r.keyCount, 0),
    totalSize: results.reduce((s, r) => s + r.encryptedSize, 0),
  };
}
