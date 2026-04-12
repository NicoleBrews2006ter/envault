import * as path from 'path';
import * as fs from 'fs';
import { createDefaultConfig, configExists, writeConfig } from '../config/project';
import { storeKey, generatePassphrase } from '../crypto/keyfile';

export interface InitOptions {
  projectName?: string;
  envFile?: string;
  force?: boolean;
}

export interface InitResult {
  success: boolean;
  message: string;
  configPath?: string;
  passphrase?: string;
}

export async function initProject(cwd: string, options: InitOptions = {}): Promise<InitResult> {
  const projectName = options.projectName ?? path.basename(cwd);
  const envFile = options.envFile ?? '.env';

  if (configExists(cwd) && !options.force) {
    return {
      success: false,
      message: 'envault is already initialized in this directory. Use --force to reinitialize.',
    };
  }

  const envFilePath = path.join(cwd, envFile);
  if (!fs.existsSync(envFilePath)) {
    fs.writeFileSync(envFilePath, '# Add your environment variables here\n', 'utf8');
  }

  const config = createDefaultConfig(projectName, envFile);
  const configPath = writeConfig(cwd, config);

  const passphrase = generatePassphrase();
  await storeKey(projectName, passphrase);

  return {
    success: true,
    message: `Initialized envault for project "${projectName}".`,
    configPath,
    passphrase,
  };
}
