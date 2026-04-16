import * as fs from 'fs';
import * as path from 'path';
import { readConfig, configExists } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { getEncryptedPath } from '../crypto/envfile';

export interface TouchResult {
  environment: string;
  existed: boolean;
  path: string;
}

export async function touch(
  projectDir: string,
  environment: string
): Promise<TouchResult> {
  if (!configExists(projectDir)) {
    throw new Error('No envault project found. Run `envault init` first.');
  }

  const config = readConfig(projectDir);
  const keys = readKeys();
  const projectKey = keys[config.projectId];

  if (!projectKey) {
    throw new Error(`No key found for project "${config.projectId}". Run \`envault init\` or \`envault add\`.`);
  }

  const encryptedPath = getEncryptedPath(projectDir, environment);
  const existed = fs.existsSync(encryptedPath);

  if (!existed) {
    const dir = path.dirname(encryptedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Write an empty encrypted env file placeholder
    fs.writeFileSync(encryptedPath, JSON.stringify({
      iv: '',
      tag: '',
      data: '',
      empty: true,
      createdAt: new Date().toISOString()
    }), 'utf-8');
  } else {
    // Update mtime
    const now = new Date();
    fs.utimesSync(encryptedPath, now, now);
  }

  return { environment, existed, path: encryptedPath };
}
