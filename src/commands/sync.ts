import * as fs from "fs";
import * as path from "path";
import { readConfig } from "../config/project";
import { readKeys } from "../crypto/keyfile";
import { encryptEnvFile, decryptEnvFile, getEncryptedPath } from "../crypto/envfile";

export interface SyncResult {
  environment: string;
  action: "locked" | "unlocked" | "skipped";
  reason?: string;
}

export async function sync(
  projectDir: string,
  direction: "lock" | "unlock"
): Promise<SyncResult[]> {
  const config = await readConfig(projectDir);
  const keys = await readKeys();
  const results: SyncResult[] = [];

  for (const environment of config.environments) {
    const key = keys[`${config.project}:${environment}`];
    if (!key) {
      results.push({ environment, action: "skipped", reason: "no key found" });
      continue;
    }

    if (direction === "lock") {
      const envPath = path.join(projectDir, `.env.${environment}`);
      if (!fs.existsSync(envPath)) {
        results.push({ environment, action: "skipped", reason: ".env file not found" });
        continue;
      }
      await encryptEnvFile(envPath, key);
      results.push({ environment, action: "locked" });
    } else {
      const encPath = getEncryptedPath(path.join(projectDir, `.env.${environment}`));
      if (!fs.existsSync(encPath)) {
        results.push({ environment, action: "skipped", reason: "encrypted file not found" });
        continue;
      }
      await decryptEnvFile(encPath, key, path.join(projectDir, `.env.${environment}`));
      results.push({ environment, action: "unlocked" });
    }
  }

  return results;
}
