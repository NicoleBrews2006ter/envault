import * as fs from "fs";
import * as path from "path";
import { configExists, readConfig } from "../config/project";
import { encryptEnvFile, getEncryptedPath } from "../crypto/envfile";
import { readKeys } from "../crypto/keyfile";

export interface LockResult {
  success: boolean;
  encryptedPath?: string;
  error?: string;
}

export async function lockEnv(
  projectDir: string,
  envName: string = "default"
): Promise<LockResult> {
  if (!configExists(projectDir)) {
    return { success: false, error: "No envault config found. Run `envault init` first." };
  }

  const config = readConfig(projectDir);
  const envFile = config.envFiles?.[envName];

  if (!envFile) {
    return { success: false, error: `No env file registered for "${envName}". Run \`envault add\` first.` };
  }

  const envFilePath = path.resolve(projectDir, envFile);

  if (!fs.existsSync(envFilePath)) {
    return { success: false, error: `Env file not found: ${envFilePath}` };
  }

  const keys = readKeys();
  const projectKey = keys[config.projectId];

  if (!projectKey) {
    return { success: false, error: `No key found for project "${config.projectId}". Run \`envault init\` to regenerate.` };
  }

  try {
    const encryptedPath = await encryptEnvFile(envFilePath, projectKey);
    return { success: true, encryptedPath };
  } catch (err: any) {
    return { success: false, error: `Encryption failed: ${err.message}` };
  }
}
