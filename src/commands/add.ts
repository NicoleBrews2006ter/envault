import * as fs from 'fs';
import * as path from 'path';
import { configExists, readConfig } from '../config/project';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { readKeys } from '../crypto/keyfile';

export interface AddOptions {
  env?: string;
  projectDir?: string;
}

export async function addEnvFile(options: AddOptions = {}): Promise<void> {
  const projectDir = options.projectDir ?? process.cwd();
  const envName = options.env ?? '.env';

  if (!configExists(projectDir)) {
    throw new Error('No envault project found. Run `envault init` first.');
  }

  const config = readConfig(projectDir);
  const envFilePath = path.join(projectDir, envName);

  if (!fs.existsSync(envFilePath)) {
    throw new Error(`Env file not found: ${envFilePath}`);
  }

  const keys = readKeys();
  const projectKey = keys[config.projectId];

  if (!projectKey) {
    throw new Error(
      `No key found for project "${config.projectId}". Run \`envault init\` to generate one.`
    );
  }

  const encryptedPath = getEncryptedPath(envFilePath);
  await encryptEnvFile(envFilePath, encryptedPath, projectKey);

  if (!config.envFiles.includes(envName)) {
    config.envFiles.push(envName);
    const { writeConfig } = await import('../config/project');
    writeConfig(projectDir, config);
  }

  console.log(`✓ Encrypted ${envName} → ${path.basename(encryptedPath)}`);
  console.log(`  Commit ${path.basename(encryptedPath)} to share with your team.`);
}
