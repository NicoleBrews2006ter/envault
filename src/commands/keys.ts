import * as path from 'path';
import * as fs from 'fs';
import { readConfig, configExists } from '../config/project';
import { readKeys } from '../crypto/keyfile';

export interface KeyEntry {
  environment: string;
  fingerprint: string;
  createdAt: string;
  algorithm: string;
}

export async function keys(projectDir: string): Promise<KeyEntry[]> {
  if (!configExists(projectDir)) {
    throw new Error('No envault project found. Run `envault init` first.');
  }

  const config = readConfig(projectDir);
  const storedKeys = readKeys();
  const projectKeys = storedKeys[config.project] ?? {};

  const entries: KeyEntry[] = [];

  for (const [env, keyData] of Object.entries(projectKeys)) {
    const raw = keyData as { key: string; createdAt?: string; algorithm?: string };
    const keyBytes = Buffer.from(raw.key, 'base64');
    const fingerprint = computeFingerprint(keyBytes);
    entries.push({
      environment: env,
      fingerprint,
      createdAt: raw.createdAt ?? 'unknown',
      algorithm: raw.algorithm ?? 'aes-256-gcm',
    });
  }

  return entries.sort((a, b) => a.environment.localeCompare(b.environment));
}

function computeFingerprint(keyBytes: Buffer): string {
  const { createHash } = require('crypto');
  return createHash('sha256').update(keyBytes).digest('hex').slice(0, 16);
}
