import * as fs from "fs";
import * as path from "path";
import { readConfig } from "../config/project";
import { readKeys } from "../crypto/keyfile";
import { decryptEnvFile, encryptEnvFile, getEncryptedPath, parseEnvContents } from "../crypto/envfile";

export interface MergeResult {
  merged: number;
  conflicts: string[];
  outputEnvironment: string;
}

export async function mergeEnvironments(
  sourceEnv: string,
  targetEnv: string,
  projectDir: string = process.cwd(),
  overwrite: boolean = false
): Promise<MergeResult> {
  const config = await readConfig(projectDir);

  if (!config.environments[sourceEnv]) {
    throw new Error(`Source environment "${sourceEnv}" does not exist`);
  }
  if (!config.environments[targetEnv]) {
    throw new Error(`Target environment "${targetEnv}" does not exist`);
  }

  const keys = await readKeys();
  const sourceKey = keys[`${path.basename(projectDir)}:${sourceEnv}`];
  const targetKey = keys[`${path.basename(projectDir)}:${targetEnv}`];

  if (!sourceKey) {
    throw new Error(`No key found for source environment "${sourceEnv}". Run 'envault unlock ${sourceEnv}' first.`);
  }
  if (!targetKey) {
    throw new Error(`No key found for target environment "${targetEnv}". Run 'envault unlock ${targetEnv}' first.`);
  }

  const sourceEncPath = getEncryptedPath(sourceEnv, projectDir);
  const targetEncPath = getEncryptedPath(targetEnv, projectDir);

  if (!fs.existsSync(sourceEncPath)) {
    throw new Error(`Encrypted file for "${sourceEnv}" not found. Run 'envault lock ${sourceEnv}' first.`);
  }
  if (!fs.existsSync(targetEncPath)) {
    throw new Error(`Encrypted file for "${targetEnv}" not found. Run 'envault lock ${targetEnv}' first.`);
  }

  const sourceDecrypted = await decryptEnvFile(sourceEnv, sourceKey, projectDir);
  const targetDecrypted = await decryptEnvFile(targetEnv, targetKey, projectDir);

  const sourceVars = parseEnvContents(sourceDecrypted);
  const targetVars = parseEnvContents(targetDecrypted);

  const conflicts: string[] = [];
  let merged = 0;

  for (const [key, value] of Object.entries(sourceVars)) {
    if (key in targetVars && targetVars[key] !== value && !overwrite) {
      conflicts.push(key);
    } else if (!(key in targetVars) || overwrite) {
      targetVars[key] = value;
      merged++;
    }
  }

  if (conflicts.length === 0 || overwrite) {
    const mergedContent = Object.entries(targetVars)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    await encryptEnvFile(mergedContent, targetEnv, targetKey, projectDir);
  }

  return { merged, conflicts, outputEnvironment: targetEnv };
}
