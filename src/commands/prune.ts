import * as fs from "fs";
import * as path from "path";
import { readConfig } from "../config/project";
import { readKeys } from "../crypto/keyfile";
import { getEncryptedPath } from "../crypto/envfile";

export interface PruneResult {
  removed: string[];
  kept: string[];
}

/**
 * Removes encrypted .env files and keys for environments that no longer
 * have a corresponding entry in the project config.
 */
export async function prune(
  projectDir: string,
  dryRun = false
): Promise<PruneResult> {
  const config = await readConfig(projectDir);
  const keys = await readKeys(projectDir);

  const configuredEnvs = new Set(config.environments.map((e: { name: string }) => e.name));

  const removed: string[] = [];
  const kept: string[] = [];

  // Prune orphaned encrypted files
  for (const envName of Object.keys(keys)) {
    if (!configuredEnvs.has(envName)) {
      const encryptedPath = getEncryptedPath(projectDir, envName);
      if (!dryRun) {
        if (fs.existsSync(encryptedPath)) {
          fs.unlinkSync(encryptedPath);
        }
        delete keys[envName];
      }
      removed.push(envName);
    } else {
      kept.push(envName);
    }
  }

  // Also check for orphaned encrypted files not tracked in keys
  const envaultDir = path.join(projectDir, ".envault");
  if (fs.existsSync(envaultDir)) {
    const files = fs.readdirSync(envaultDir);
    for (const file of files) {
      if (file.endsWith(".enc")) {
        const envName = file.replace(/\.enc$/, "");
        if (!configuredEnvs.has(envName) && !removed.includes(envName)) {
          const filePath = path.join(envaultDir, file);
          if (!dryRun) {
            fs.unlinkSync(filePath);
          }
          removed.push(envName);
        }
      }
    }
  }

  if (!dryRun && removed.length > 0) {
    const { writeKeys } = await import("../crypto/keyfile");
    await writeKeys(projectDir, keys);
  }

  return { removed, kept };
}
