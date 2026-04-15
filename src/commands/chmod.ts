import * as fs from 'fs';
import * as path from 'path';
import { readConfig } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { getEncryptedPath } from '../crypto/envfile';

export type ChmodMode = 'owner' | 'group' | 'world';

export interface ChmodResult {
  environment: string;
  mode: ChmodMode;
  previousMode: ChmodMode | null;
  changed: boolean;
}

const MODE_PERMISSIONS: Record<ChmodMode, number> = {
  owner: 0o600,
  group: 0o640,
  world: 0o644,
};

function detectMode(filePath: string): ChmodMode | null {
  try {
    const stat = fs.statSync(filePath);
    const perms = stat.mode & 0o777;
    if (perms === 0o600) return 'owner';
    if (perms === 0o640) return 'group';
    if (perms === 0o644) return 'world';
    return null;
  } catch {
    return null;
  }
}

export async function chmod(
  projectDir: string,
  environment: string,
  mode: ChmodMode
): Promise<ChmodResult> {
  const config = await readConfig(projectDir);
  if (!config.environments.includes(environment)) {
    throw new Error(`Environment "${environment}" does not exist.`);
  }

  const keys = await readKeys();
  if (!keys[config.project]?.[environment]) {
    throw new Error(`No key found for environment "${environment}". Run 'envault add' first.`);
  }

  const encryptedPath = getEncryptedPath(projectDir, environment);
  if (!fs.existsSync(encryptedPath)) {
    throw new Error(`Encrypted file not found for environment "${environment}".`);
  }

  const previousMode = detectMode(encryptedPath);
  const targetPerms = MODE_PERMISSIONS[mode];
  fs.chmodSync(encryptedPath, targetPerms);

  return {
    environment,
    mode,
    previousMode,
    changed: previousMode !== mode,
  };
}
