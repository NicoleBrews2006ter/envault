import * as fs from 'fs';
import * as path from 'path';
import { configExists, readConfig } from '../config/project';
import { decryptEnvFile, getEncryptedPath, encryptEnvFile } from '../crypto/envfile';
import { readKeys } from '../crypto/keyfile';

export type SortOrder = 'asc' | 'desc';

export function sortEnvContents(contents: string, order: SortOrder = 'asc'): string {
  const lines = contents.split('\n');
  const commentBlocks: string[] = [];
  const entries: { key: string; line: string }[] = [];
  const trailing: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      // preserve trailing blank lines separately
      if (entries.length > 0) {
        trailing.push(line);
      }
      i++;
      continue;
    }
    if (line.trimStart().startsWith('#')) {
      commentBlocks.push(line);
      i++;
      continue;
    }
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) {
      entries.push({ key: match[1], line });
    } else {
      entries.push({ key: line, line });
    }
    i++;
  }

  const sorted = [...entries].sort((a, b) =>
    order === 'asc'
      ? a.key.localeCompare(b.key)
      : b.key.localeCompare(a.key)
  );

  const result = [
    ...commentBlocks,
    ...sorted.map((e) => e.line),
    ...trailing,
  ];

  return result.join('\n');
}

export async function sort(
  environment: string,
  order: SortOrder = 'asc',
  cwd: string = process.cwd()
): Promise<{ sorted: number; environment: string }> {
  if (!configExists(cwd)) {
    throw new Error('No envault project found. Run `envault init` first.');
  }

  const config = readConfig(cwd);
  if (!config.environments.includes(environment)) {
    throw new Error(`Environment "${environment}" does not exist.`);
  }

  const keys = readKeys();
  const passphrase = keys[`${config.name}:${environment}`];
  if (!passphrase) {
    throw new Error(`No key found for environment "${environment}". Run \`envault add ${environment}\` first.`);
  }

  const encryptedPath = getEncryptedPath(environment, cwd);
  if (!fs.existsSync(encryptedPath)) {
    throw new Error(`Encrypted file not found for environment "${environment}".`);
  }

  const contents = await decryptEnvFile(environment, passphrase, cwd);
  const sortedContents = sortEnvContents(contents, order);
  await encryptEnvFile(sortedContents, environment, passphrase, cwd);

  const count = sortedContents
    .split('\n')
    .filter((l) => l.trim() && !l.trimStart().startsWith('#') && l.includes('=')).length;

  return { sorted: count, environment };
}
