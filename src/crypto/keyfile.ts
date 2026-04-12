import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

const ENVAULT_DIR = path.join(os.homedir(), '.envault');
const KEYS_FILE = path.join(ENVAULT_DIR, 'keys.json');

export interface KeyEntry {
  projectId: string;
  passphrase: string;
  createdAt: string;
}

function ensureEnvaultDir(): void {
  if (!fs.existsSync(ENVAULT_DIR)) {
    fs.mkdirSync(ENVAULT_DIR, { recursive: true, mode: 0o700 });
  }
}

function readKeys(): Record<string, KeyEntry> {
  if (!fs.existsSync(KEYS_FILE)) return {};
  const raw = fs.readFileSync(KEYS_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeKeys(keys: Record<string, KeyEntry>): void {
  ensureEnvaultDir();
  fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), { mode: 0o600 });
}

export function generatePassphrase(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function storeKey(projectId: string, passphrase: string): void {
  const keys = readKeys();
  keys[projectId] = { projectId, passphrase, createdAt: new Date().toISOString() };
  writeKeys(keys);
}

export function getKey(projectId: string): string | null {
  const keys = readKeys();
  return keys[projectId]?.passphrase ?? null;
}

export function removeKey(projectId: string): boolean {
  const keys = readKeys();
  if (!keys[projectId]) return false;
  delete keys[projectId];
  writeKeys(keys);
  return true;
}

export function listKeys(): KeyEntry[] {
  return Object.values(readKeys());
}
