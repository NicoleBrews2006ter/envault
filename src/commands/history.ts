import * as fs from 'fs';
import * as path from 'path';
import { readConfig } from '../config/project';
import { ensureEnvaultDir } from '../crypto/keyfile';

export interface HistoryEntry {
  timestamp: string;
  action: string;
  environment: string;
  user?: string;
}

function getHistoryPath(projectDir: string): string {
  const envaultDir = path.join(projectDir, '.envault');
  return path.join(envaultDir, 'history.json');
}

export function readHistory(projectDir: string): HistoryEntry[] {
  const historyPath = getHistoryPath(projectDir);
  if (!fs.existsSync(historyPath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(historyPath, 'utf-8');
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function appendHistory(projectDir: string, entry: Omit<HistoryEntry, 'timestamp'>): void {
  ensureEnvaultDir(projectDir);
  const entries = readHistory(projectDir);
  entries.push({ ...entry, timestamp: new Date().toISOString() });
  const historyPath = getHistoryPath(projectDir);
  fs.writeFileSync(historyPath, JSON.stringify(entries, null, 2));
}

export interface HistoryOptions {
  environment?: string;
  limit?: number;
}

export function history(projectDir: string, options: HistoryOptions = {}): HistoryEntry[] {
  const config = readConfig(projectDir);
  if (!config) {
    throw new Error('No envault config found. Run `envault init` first.');
  }

  let entries = readHistory(projectDir);

  if (options.environment) {
    entries = entries.filter((e) => e.environment === options.environment);
  }

  entries = entries.slice().reverse();

  if (options.limit && options.limit > 0) {
    entries = entries.slice(0, options.limit);
  }

  return entries;
}
