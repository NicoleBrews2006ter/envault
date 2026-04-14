import * as fs from 'fs';
import * as path from 'path';
import { readConfig } from '../config/project';
import { readKeys, storeKey } from '../crypto/keyfile';
import { getEncryptedPath } from '../crypto/envfile';

export interface ShareOptions {
  projectDir: string;
  environment: string;
  recipient: string;
  keyOverride?: string;
}

export interface ShareResult {
  environment: string;
  recipient: string;
  exportedKeyFile: string;
}

/**
 * Exports an encrypted key bundle for a given environment so a teammate
 * can import it into their own keyfile.
 */
export async function share(options: ShareOptions): Promise<ShareResult> {
  const { projectDir, environment, recipient, keyOverride } = options;

  const config = readConfig(projectDir);
  if (!config.environments.includes(environment)) {
    throw new Error(`Environment "${environment}" does not exist in this project.`);
  }

  const encryptedPath = getEncryptedPath(projectDir, environment);
  if (!fs.existsSync(encryptedPath)) {
    throw new Error(`No locked file found for environment "${environment}". Run 'envault lock' first.`);
  }

  const keys = readKeys(projectDir);
  const keyEntry = keys[environment];
  if (!keyEntry) {
    throw new Error(`No key found for environment "${environment}".`);
  }

  const passphrase = keyOverride ?? keyEntry;

  const bundle = {
    project: config.name,
    environment,
    passphrase,
    sharedBy: process.env.USER ?? 'unknown',
    sharedAt: new Date().toISOString(),
    recipient,
  };

  const shareDir = path.join(projectDir, '.envault', 'shares');
  fs.mkdirSync(shareDir, { recursive: true });

  const filename = `${environment}-${recipient}-${Date.now()}.share.json`;
  const exportedKeyFile = path.join(shareDir, filename);

  fs.writeFileSync(exportedKeyFile, JSON.stringify(bundle, null, 2), 'utf-8');

  return { environment, recipient, exportedKeyFile };
}

/**
 * Imports a share bundle file and stores the key locally.
 */
export async function importShare(options: { projectDir: string; shareFile: string }): Promise<{ environment: string }> {
  const { projectDir, shareFile } = options;

  if (!fs.existsSync(shareFile)) {
    throw new Error(`Share file not found: ${shareFile}`);
  }

  const raw = fs.readFileSync(shareFile, 'utf-8');
  const bundle = JSON.parse(raw) as { environment: string; passphrase: string; project: string };

  if (!bundle.environment || !bundle.passphrase) {
    throw new Error('Invalid share bundle: missing required fields.');
  }

  const config = readConfig(projectDir);
  if (config.name !== bundle.project) {
    throw new Error(`Share bundle is for project "${bundle.project}" but current project is "${config.name}".`);
  }

  storeKey(projectDir, bundle.environment, bundle.passphrase);

  return { environment: bundle.environment };
}
