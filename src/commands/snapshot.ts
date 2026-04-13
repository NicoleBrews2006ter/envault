import * as fs from 'fs';
import * as path from 'path';
import { readConfig } from '../config/project';
import { readKeys } from '../crypto/keyfile';
import { decryptEnvFile, getEncryptedPath } from '../crypto/envfile';

export interface Snapshot {
  environment: string;
  timestamp: string;
  label?: string;
  contents: string;
}

export function getSnapshotDir(projectDir: string): string {
  return path.join(projectDir, '.envault', 'snapshots');
}

export function getSnapshotPath(projectDir: string, environment: string, timestamp: string): string {
  return path.join(getSnapshotDir(projectDir), `${environment}-${timestamp}.json`);
}

export async function createSnapshot(
  projectDir: string,
  environment: string,
  label?: string
): Promise<Snapshot> {
  const config = await readConfig(projectDir);
  if (!config.environments.includes(environment)) {
    throw new Error(`Environment "${environment}" does not exist.`);
  }

  const keys = await readKeys(projectDir);
  const key = keys[environment];
  if (!key) {
    throw new Error(`No key found for environment "${environment}".`);
  }

  const encryptedPath = getEncryptedPath(projectDir, environment);
  if (!fs.existsSync(encryptedPath)) {
    throw new Error(`No encrypted file found for environment "${environment}".`);
  }

  const contents = await decryptEnvFile(encryptedPath, key);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshot: Snapshot = { environment, timestamp, contents, label };

  const snapshotDir = getSnapshotDir(projectDir);
  fs.mkdirSync(snapshotDir, { recursive: true });
  const snapshotPath = getSnapshotPath(projectDir, environment, timestamp);
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');

  return snapshot;
}

export async function listSnapshots(projectDir: string, environment?: string): Promise<Snapshot[]> {
  const snapshotDir = getSnapshotDir(projectDir);
  if (!fs.existsSync(snapshotDir)) return [];

  const files = fs.readdirSync(snapshotDir).filter(f => f.endsWith('.json'));
  const snapshots: Snapshot[] = files.map(f => {
    const raw = fs.readFileSync(path.join(snapshotDir, f), 'utf-8');
    return JSON.parse(raw) as Snapshot;
  });

  return environment ? snapshots.filter(s => s.environment === environment) : snapshots;
}

export async function restoreSnapshot(
  projectDir: string,
  environment: string,
  timestamp: string
): Promise<void> {
  const snapshotPath = getSnapshotPath(projectDir, environment, timestamp);
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Snapshot not found: ${environment} @ ${timestamp}`);
  }

  const snapshot: Snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  const keys = await readKeys(projectDir);
  const key = keys[environment];
  if (!key) throw new Error(`No key found for environment "${environment}".`);

  const { encryptEnvFile } = await import('../crypto/envfile');
  const encryptedPath = getEncryptedPath(projectDir, environment);
  await encryptEnvFile(snapshot.contents, encryptedPath, key);
}
