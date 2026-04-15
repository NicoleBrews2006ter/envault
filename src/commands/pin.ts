import * as fs from 'fs';
import * as path from 'path';
import { readConfig } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { getEncryptedPath } from '../crypto/envfile';

export interface PinResult {
  environment: string;
  pinnedAt: string;
  checksum: string;
}

export function getPinPath(projectDir: string, environment: string): string {
  return path.join(projectDir, '.envault', 'pins', `${environment}.pin`);
}

export function computeChecksum(filePath: string): string {
  const content = fs.readFileSync(filePath);
  const { createHash } = require('crypto');
  return createHash('sha256').update(content).digest('hex');
}

export async function pin(
  projectDir: string,
  environment: string
): Promise<PinResult> {
  const config = await readConfig(projectDir);
  if (!config.environments.includes(environment)) {
    throw new Error(`Environment "${environment}" does not exist.`);
  }

  const keys = await readKeys(projectDir);
  if (!keys[environment]) {
    throw new Error(`No key found for environment "${environment}".`);
  }

  const encryptedPath = getEncryptedPath(projectDir, environment);
  if (!fs.existsSync(encryptedPath)) {
    throw new Error(
      `Encrypted file not found for environment "${environment}". Run "lock" first.`
    );
  }

  const checksum = computeChecksum(encryptedPath);
  const pinnedAt = new Date().toISOString();
  const pinData = { environment, pinnedAt, checksum };

  const pinDir = path.join(projectDir, '.envault', 'pins');
  if (!fs.existsSync(pinDir)) {
    fs.mkdirSync(pinDir, { recursive: true });
  }

  const pinPath = getPinPath(projectDir, environment);
  fs.writeFileSync(pinPath, JSON.stringify(pinData, null, 2), 'utf-8');

  return pinData;
}

export async function unpin(
  projectDir: string,
  environment: string
): Promise<void> {
  const pinPath = getPinPath(projectDir, environment);
  if (!fs.existsSync(pinPath)) {
    throw new Error(`No pin found for environment "${environment}".`);
  }
  fs.unlinkSync(pinPath);
}

export async function checkPin(
  projectDir: string,
  environment: string
): Promise<{ pinned: boolean; valid?: boolean; pin?: PinResult }> {
  const pinPath = getPinPath(projectDir, environment);
  if (!fs.existsSync(pinPath)) {
    return { pinned: false };
  }
  const pin: PinResult = JSON.parse(fs.readFileSync(pinPath, 'utf-8'));
  const encryptedPath = getEncryptedPath(projectDir, environment);
  if (!fs.existsSync(encryptedPath)) {
    return { pinned: true, valid: false, pin };
  }
  const currentChecksum = computeChecksum(encryptedPath);
  return { pinned: true, valid: currentChecksum === pin.checksum, pin };
}
