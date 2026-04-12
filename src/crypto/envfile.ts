import * as fs from 'fs';
import * as path from 'path';
import { encrypt, decrypt } from './encryption';

export const ENCRYPTED_EXT = '.enc';

export function encryptEnvFile(
  envFilePath: string,
  outputPath: string,
  passphrase: string
): void {
  if (!fs.existsSync(envFilePath)) {
    throw new Error(`Env file not found: ${envFilePath}`);
  }
  const plaintext = fs.readFileSync(envFilePath, 'utf-8');
  const ciphertext = encrypt(plaintext, passphrase);
  fs.writeFileSync(outputPath, ciphertext, 'utf-8');
}

export function decryptEnvFile(
  encryptedFilePath: string,
  outputPath: string,
  passphrase: string
): void {
  if (!fs.existsSync(encryptedFilePath)) {
    throw new Error(`Encrypted file not found: ${encryptedFilePath}`);
  }
  const ciphertext = fs.readFileSync(encryptedFilePath, 'utf-8');
  const plaintext = decrypt(ciphertext, passphrase);
  fs.writeFileSync(outputPath, plaintext, 'utf-8');
}

export function getEncryptedPath(envFilePath: string): string {
  return envFilePath + ENCRYPTED_EXT;
}

export function parseEnvContents(contents: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (key) result[key] = value;
  }
  return result;
}
