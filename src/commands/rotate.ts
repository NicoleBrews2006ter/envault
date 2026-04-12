import * as path from "path";
import { configExists, readConfig } from "../config/project";
import { readKeys, writeKeys, generatePassphrase, storeKey } from "../crypto/keyfile";
import { deriveKey } from "../crypto/encryption";
import { encryptEnvFile, decryptEnvFile, getEncryptedPath } from "../crypto/envfile";
import * as fs from "fs";

export interface RotateOptions {
  projectDir?: string;
  environment?: string;
}

export interface RotateResult {
  environment: string;
  newPassphrase: string;
}

export async function rotateKey(options: RotateOptions = {}): Promise<RotateResult> {
  const projectDir = options.projectDir ?? process.cwd();
  const environment = options.environment ?? "default";

  if (!configExists(projectDir)) {
    throw new Error("No envault config found. Run `envault init` first.");
  }

  const config = readConfig(projectDir);
  const keys = readKeys();
  const projectId = config.projectId;

  const existingEntry = keys[projectId]?.[environment];
  if (!existingEntry) {
    throw new Error(`No key found for environment "${environment}". Use \`envault add\` first.`);
  }

  const encryptedPath = getEncryptedPath(projectDir, environment);
  const envFilePath = path.join(projectDir, environment === "default" ? ".env" : `.env.${environment}`);

  let plaintext: string | null = null;

  if (fs.existsSync(encryptedPath)) {
    const oldKey = await deriveKey(existingEntry.passphrase, existingEntry.salt);
    plaintext = await decryptEnvFile(encryptedPath, oldKey);
  }

  const newPassphrase = generatePassphrase();
  storeKey(projectId, environment, newPassphrase);

  const updatedKeys = readKeys();
  const newEntry = updatedKeys[projectId][environment];
  const newKey = await deriveKey(newPassphrase, newEntry.salt);

  if (plaintext !== null) {
    await encryptEnvFile(plaintext, encryptedPath, newKey);
  }

  return { environment, newPassphrase };
}
