import * as fs from 'fs';
import * as path from 'path';
import { readConfig } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { decryptEnvFile, getEncryptedPath } from '../crypto/envfile';

export interface FetchResult {
  environment: string;
  outputPath: string;
  skipped: boolean;
  reason?: string;
}

export async function fetch(
  projectDir: string,
  environments: string[],
  options: { force?: boolean; outputDir?: string } = {}
): Promise<FetchResult[]> {
  const config = await readConfig(projectDir);
  const keys = await readKeys();
  const results: FetchResult[] = [];

  const envList =
    environments.length > 0 ? environments : Object.keys(config.environments ?? {});

  for (const env of envList) {
    const encryptedPath = getEncryptedPath(projectDir, env);

    if (!fs.existsSync(encryptedPath)) {
      results.push({ environment: env, outputPath: '', skipped: true, reason: 'no encrypted file found' });
      continue;
    }

    const keyEntry = keys[`${config.name}:${env}`];
    if (!keyEntry) {
      results.push({ environment: env, outputPath: '', skipped: true, reason: 'no key available' });
      continue;
    }

    const outputDir = options.outputDir ?? projectDir;
    const outputPath = path.join(outputDir, env === 'default' ? '.env' : `.env.${env}`);

    if (fs.existsSync(outputPath) && !options.force) {
      results.push({ environment: env, outputPath, skipped: true, reason: 'output file already exists (use --force to overwrite)' });
      continue;
    }

    await decryptEnvFile(encryptedPath, outputPath, keyEntry.passphrase);
    results.push({ environment: env, outputPath, skipped: false });
  }

  return results;
}
