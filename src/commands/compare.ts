import * as fs from "fs";
import * as path from "path";
import { readConfig } from "../config/project";
import { readKeys } from "../crypto/keyfile";
import { decryptEnvFile, getEncryptedPath, parseEnvContents } from "../crypto/envfile";

export interface CompareResult {
  onlyInA: string[];
  onlyInB: string[];
  different: string[];
  same: string[];
}

export async function compare(
  projectDir: string,
  envA: string,
  envB: string
): Promise<CompareResult> {
  const config = readConfig(projectDir);

  if (!config.environments[envA]) {
    throw new Error(`Environment "${envA}" not found`);
  }
  if (!config.environments[envB]) {
    throw new Error(`Environment "${envB}" not found`);
  }

  const keys = readKeys();

  const encPathA = getEncryptedPath(projectDir, envA);
  const encPathB = getEncryptedPath(projectDir, envB);

  if (!fs.existsSync(encPathA)) {
    throw new Error(`Encrypted file for "${envA}" not found. Run 'envault lock' first.`);
  }
  if (!fs.existsSync(encPathB)) {
    throw new Error(`Encrypted file for "${envB}" not found. Run 'envault lock' first.`);
  }

  const passphraseA = keys[`${path.basename(projectDir)}:${envA}`];
  const passphraseB = keys[`${path.basename(projectDir)}:${envB}`];

  if (!passphraseA) throw new Error(`No key found for environment "${envA}"`);
  if (!passphraseB) throw new Error(`No key found for environment "${envB}"`);

  const contentsA = await decryptEnvFile(encPathA, passphraseA);
  const contentsB = await decryptEnvFile(encPathB, passphraseB);

  const varsA = parseEnvContents(contentsA);
  const varsB = parseEnvContents(contentsB);

  const keysA = new Set(Object.keys(varsA));
  const keysB = new Set(Object.keys(varsB));
  const allKeys = new Set([...keysA, ...keysB]);

  const result: CompareResult = { onlyInA: [], onlyInB: [], different: [], same: [] };

  for (const key of allKeys) {
    if (!keysB.has(key)) {
      result.onlyInA.push(key);
    } else if (!keysA.has(key)) {
      result.onlyInB.push(key);
    } else if (varsA[key] !== varsB[key]) {
      result.different.push(key);
    } else {
      result.same.push(key);
    }
  }

  return result;
}
