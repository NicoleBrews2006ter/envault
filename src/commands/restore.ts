import * as fs from "fs";
import * as path from "path";
import { readConfig } from "../config/project";
import { readKeys } from "../crypto/keyfile";
import { decryptEnvFile } from "../crypto/envfile";
import { getSnapshotPath, getSnapshotDir } from "./snapshot";

export interface RestoreOptions {
  environment: string;
  snapshot: string;
  output?: string;
  force?: boolean;
}

export interface RestoreResult {
  environment: string;
  snapshot: string;
  outputPath: string;
  restored: boolean;
}

export async function restore(
  projectDir: string,
  options: RestoreOptions
): Promise<RestoreResult> {
  const config = await readConfig(projectDir);

  if (!config.environments.includes(options.environment)) {
    throw new Error(`Environment "${options.environment}" does not exist.`);
  }

  const snapshotPath = getSnapshotPath(projectDir, options.environment, options.snapshot);

  if (!fs.existsSync(snapshotPath)) {
    const snapshotDir = getSnapshotDir(projectDir, options.environment);
    const available = fs.existsSync(snapshotDir)
      ? fs.readdirSync(snapshotDir).map((f) => path.basename(f, ".enc"))
      : [];
    throw new Error(
      `Snapshot "${options.snapshot}" not found for environment "${options.environment}".` +
        (available.length > 0 ? ` Available: ${available.join(", ")}` : "")
    );
  }

  const keys = await readKeys(projectDir);
  const passphrase = keys[options.environment];

  if (!passphrase) {
    throw new Error(`No key found for environment "${options.environment}".`);
  }

  const outputPath =
    options.output ??
    path.join(projectDir, `.env.${options.environment}`);

  if (fs.existsSync(outputPath) && !options.force) {
    throw new Error(
      `Output file "${outputPath}" already exists. Use --force to overwrite.`
    );
  }

  const decrypted = await decryptEnvFile(snapshotPath, passphrase);
  fs.writeFileSync(outputPath, decrypted, "utf8");

  return {
    environment: options.environment,
    snapshot: options.snapshot,
    outputPath,
    restored: true,
  };
}
