import * as fs from 'fs';
import * as path from 'path';
import { readConfig } from '../config/project';
import { getSnapshotDir, getSnapshotPath } from './snapshot';
import { decryptEnvFile, encryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { readKeys } from '../crypto/keyfile';

export interface RollbackOptions {
  projectDir?: string;
  snapshotId?: string;
}

export interface RollbackResult {
  environment: string;
  snapshotId: string;
  restoredAt: string;
}

export async function rollback(
  environment: string,
  options: RollbackOptions = {}
): Promise<RollbackResult> {
  const projectDir = options.projectDir ?? process.cwd();
  const config = await readConfig(projectDir);

  if (!config.environments.includes(environment)) {
    throw new Error(`Environment "${environment}" not found in project config.`);
  }

  const snapshotDir = getSnapshotDir(projectDir, environment);

  if (!fs.existsSync(snapshotDir)) {
    throw new Error(`No snapshots found for environment "${environment}".`);
  }

  let snapshotId = options.snapshotId;

  if (!snapshotId) {
    const entries = fs
      .readdirSync(snapshotDir)
      .filter((f) => f.endsWith('.enc'))
      .sort()
      .reverse();

    if (entries.length < 2) {
      throw new Error(`Not enough snapshots to rollback for environment "${environment}".`);
    }

    snapshotId = entries[1].replace('.enc', '');
  }

  const snapshotPath = getSnapshotPath(projectDir, environment, snapshotId);

  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Snapshot "${snapshotId}" not found for environment "${environment}".`);
  }

  const keys = await readKeys();
  const keyEntry = keys[`${config.project}:${environment}`];

  if (!keyEntry) {
    throw new Error(`No key found for environment "${environment}". Run "envault add" first.`);
  }

  const decrypted = await decryptEnvFile(snapshotPath, keyEntry.passphrase);
  const encryptedPath = getEncryptedPath(projectDir, environment);
  await encryptEnvFile(decrypted, encryptedPath, keyEntry.passphrase);

  return {
    environment,
    snapshotId,
    restoredAt: new Date().toISOString(),
  };
}
