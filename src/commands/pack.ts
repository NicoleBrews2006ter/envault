import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { readConfig, configExists } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { getEncryptedPath } from '../crypto/envfile';

export interface PackResult {
  outputPath: string;
  environments: string[];
  includedKeys: boolean;
}

export async function pack(
  projectDir: string,
  outputPath?: string,
  includeKeys: boolean = false
): Promise<PackResult> {
  if (!configExists(projectDir)) {
    throw new Error('No envault project found. Run `envault init` first.');
  }

  const config = readConfig(projectDir);
  const environments = Object.keys(config.environments);

  if (environments.length === 0) {
    throw new Error('No environments found. Add one with `envault add`.');
  }

  const bundle: Record<string, unknown> = {
    version: 1,
    project: config.project,
    createdAt: new Date().toISOString(),
    environments: {} as Record<string, string>,
  };

  for (const env of environments) {
    const encPath = getEncryptedPath(projectDir, env);
    if (fs.existsSync(encPath)) {
      const contents = fs.readFileSync(encPath, 'utf8');
      (bundle.environments as Record<string, string>)[env] = contents;
    }
  }

  if (includeKeys) {
    const keys = readKeys(projectDir);
    bundle.keys = keys;
  }

  const bundleJson = JSON.stringify(bundle, null, 2);
  const dest =
    outputPath ??
    path.join(os.tmpdir(), `${config.project}-envault-bundle.json`);

  fs.writeFileSync(dest, bundleJson, 'utf8');

  return {
    outputPath: dest,
    environments,
    includedKeys: includeKeys,
  };
}
