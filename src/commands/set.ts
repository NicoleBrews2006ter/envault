import * as fs from "fs";
import * as path from "path";
import { configExists, readConfig } from "../config/project";
import { readKeys } from "../crypto/keyfile";
import { decryptEnvFile, encryptEnvFile, getEncryptedPath } from "../crypto/envfile";

export interface SetOptions {
  projectDir?: string;
}

export async function set(
  environment: string,
  key: string,
  value: string,
  options: SetOptions = {}
): Promise<void> {
  const projectDir = options.projectDir ?? process.cwd();

  if (!configExists(projectDir)) {
    throw new Error("No envault project found. Run `envault init` first.");
  }

  const config = readConfig(projectDir);
  if (!config.environments.includes(environment)) {
    throw new Error(`Environment "${environment}" does not exist. Use \`envault add ${environment}\` first.`);
  }

  const keys = readKeys();
  const projectKey = keys[config.projectId];
  if (!projectKey) {
    throw new Error("No key found for this project. Run `envault init` or `envault import`.");
  }

  const encryptedPath = getEncryptedPath(projectDir, environment);
  let envVars: Record<string, string> = {};

  if (fs.existsSync(encryptedPath)) {
    const existing = await decryptEnvFile(encryptedPath, projectKey);
    for (const line of existing.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim();
      envVars[k] = v;
    }
  }

  envVars[key] = value;

  const contents = Object.entries(envVars)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  await encryptEnvFile(contents, encryptedPath, projectKey);
}
