import * as fs from 'fs';
import * as path from 'path';
import { readConfig, configExists } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { decryptEnvFile, getEncryptedPath, parseEnvContents } from '../crypto/envfile';

export interface DiffResult {
  environment: string;
  onlyInEncrypted: string[];
  onlyInPlaintext: string[];
  changed: string[];
  unchanged: number;
}

export async function diffCommand(
  environment: string,
  plaintextPath?: string
): Promise<DiffResult> {
  if (!configExists()) {
    throw new Error('No envault config found. Run `envault init` first.');
  }

  const config = readConfig();
  if (!config.environments[environment]) {
    throw new Error(`Environment "${environment}" does not exist.`);
  }

  const keys = readKeys();
  const key = keys[config.projectId]?.[environment];
  if (!key) {
    throw new Error(`No key found for environment "${environment}". Run \`envault add ${environment}\` first.`);
  }

  const encryptedPath = getEncryptedPath(environment, config);
  if (!fs.existsSync(encryptedPath)) {
    throw new Error(`Encrypted file not found for environment "${environment}". Run \`envault lock ${environment}\` first.`);
  }

  const decryptedContent = await decryptEnvFile(encryptedPath, key);
  const encryptedVars = parseEnvContents(decryptedContent);

  const resolvedPlaintextPath = plaintextPath
    ? path.resolve(plaintextPath)
    : path.resolve(process.cwd(), '.env');

  if (!fs.existsSync(resolvedPlaintextPath)) {
    throw new Error(`Plaintext file not found: ${resolvedPlaintextPath}`);
  }

  const plaintextContent = fs.readFileSync(resolvedPlaintextPath, 'utf-8');
  const plaintextVars = parseEnvContents(plaintextContent);

  const encryptedKeys = new Set(Object.keys(encryptedVars));
  const plaintextKeys = new Set(Object.keys(plaintextVars));

  const onlyInEncrypted = [...encryptedKeys].filter(k => !plaintextKeys.has(k));
  const onlyInPlaintext = [...plaintextKeys].filter(k => !encryptedKeys.has(k));
  const shared = [...encryptedKeys].filter(k => plaintextKeys.has(k));
  const changed = shared.filter(k => encryptedVars[k] !== plaintextVars[k]);
  const unchanged = shared.length - changed.length;

  return { environment, onlyInEncrypted, onlyInPlaintext, changed, unchanged };
}
