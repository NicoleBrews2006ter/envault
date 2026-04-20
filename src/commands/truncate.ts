import * as fs from "fs";
import * as path from "path";
import { configExists, readConfig } from "../config/project";
import { decryptEnvFile, encryptEnvFile, getEncryptedPath } from "../crypto/envfile";
import { readKeys } from "../crypto/keyfile";

export interface TruncateOptions {
  lines: number;
  from?: "top" | "bottom";
}

export async function truncate(
  projectDir: string,
  environment: string,
  options: TruncateOptions
): Promise<{ removed: number; remaining: number }> {
  if (!configExists(projectDir)) {
    throw new Error("No envault project found. Run 'envault init' first.");
  }

  const config = readConfig(projectDir);
  if (!config.environments.includes(environment)) {
    throw new Error(`Environment '${environment}' does not exist.`);
  }

  const encryptedPath = getEncryptedPath(projectDir, environment);
  if (!fs.existsSync(encryptedPath)) {
    throw new Error(`No encrypted file found for environment '${environment}'.`);
  }

  const keys = readKeys();
  const keyEntry = keys[`${config.name}:${environment}`];
  if (!keyEntry) {
    throw new Error(`No key found for environment '${environment}'. Use 'envault add' to add access.`);
  }

  const contents = await decryptEnvFile(encryptedPath, keyEntry.passphrase);
  const lines = contents.split("\n").filter((l) => l.trim() !== "");

  const count = Math.min(options.lines, lines.length);
  const from = options.from ?? "bottom";

  let remaining: string[];
  if (from === "top") {
    remaining = lines.slice(count);
  } else {
    remaining = lines.slice(0, lines.length - count);
  }

  const newContents = remaining.join("\n") + (remaining.length > 0 ? "\n" : "");
  await encryptEnvFile(newContents, encryptedPath, keyEntry.passphrase);

  return { removed: lines.length - remaining.length, remaining: remaining.length };
}
