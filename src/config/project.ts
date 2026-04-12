import * as fs from 'fs';
import * as path from 'path';

export interface EnvaultConfig {
  version: string;
  projectName: string;
  encryptedFile: string;
  gitTracked: boolean;
  createdAt: string;
}

const CONFIG_FILE_NAME = '.envault.json';
const DEFAULT_ENCRYPTED_FILE = '.env.vault';

export function getConfigPath(cwd: string = process.cwd()): string {
  return path.join(cwd, CONFIG_FILE_NAME);
}

export function configExists(cwd: string = process.cwd()): boolean {
  return fs.existsSync(getConfigPath(cwd));
}

export function readConfig(cwd: string = process.cwd()): EnvaultConfig {
  const configPath = getConfigPath(cwd);
  if (!fs.existsSync(configPath)) {
    throw new Error(`No envault config found at ${configPath}. Run 'envault init' first.`);
  }
  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw) as EnvaultConfig;
}

export function writeConfig(config: EnvaultConfig, cwd: string = process.cwd()): void {
  const configPath = getConfigPath(cwd);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

export function createDefaultConfig(projectName: string): EnvaultConfig {
  return {
    version: '1.0.0',
    projectName,
    encryptedFile: DEFAULT_ENCRYPTED_FILE,
    gitTracked: true,
    createdAt: new Date().toISOString(),
  };
}
