import * as fs from "fs";
import { configExists, readConfig } from "../config/project";
import { readKeys } from "../crypto/keyfile";
import { decryptEnvFile, encryptEnvFile, getEncryptedPath } from "../crypto/envfile";

export interface UnsetOptions {
  projectDir?: string;
}

export async function unset(
  environment: string,
  key: string,
  options: UnsetOptions = {}
): Promise<boolean> {
  const projectDir = options.projectDir ?? process.cwd();

  if (!configExists(projectDir)) {
    throw new Error("No envault project found. Run `envault init` first.");
  }

  const config = readConfig(projectDir);
  if (!config.environments.includes(environment)) {
    throw new Error(`Environment "${environment}" does not exist.`);
  }

  const keys = readKeys();
  const projectKey = keys[config.projectId];
  if (!projectKey) {
    throw new Error("No key found for this project.");
  }

  const encryptedPath = getEncryptedPath(projectDir, environment);
  if (!fs.existsSync(encryptedPath)) {
    return false;
  }

  const existing = await decryptEnvFile(encryptedPath, projectKey);
  const lines = existing.split("\n");
  const filtered: string[] = [];
  let removed = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      filtered.push(line);
      continue;
    }
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) {
      filtered.push(line);
      continue;
    }
    const k = trimmed.slice(0, eqIdx).trim();
    if (k === key) {
      removed = true;
    } else {
      filtered.push(line);
    }
  }

  if (!removed) return false;

  const contents = filtered.join("\n");
  await encryptEnvFile(contents, encryptedPath, projectKey);
  return true;
}
