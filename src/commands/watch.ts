import * as fs from "fs";
import * as path from "path";
import { configExists, readConfig } from "../config/project";
import { encryptEnvFile, getEncryptedPath } from "../crypto/envfile";
import { readKeys } from "../crypto/keyfile";

export interface WatchOptions {
  environment: string;
  projectDir?: string;
}

export interface WatchResult {
  watching: boolean;
  filePath: string;
  environment: string;
}

export async function watch(
  options: WatchOptions,
  onChange?: (event: string, filePath: string) => void
): Promise<{ stop: () => void } & WatchResult> {
  const projectDir = options.projectDir ?? process.cwd();

  if (!configExists(projectDir)) {
    throw new Error("No envault project found. Run `envault init` first.");
  }

  const config = readConfig(projectDir);
  const env = options.environment;

  if (!config.environments.includes(env)) {
    throw new Error(`Environment "${env}" does not exist.`);
  }

  const keys = readKeys();
  const key = keys[`${config.project}:${env}`];
  if (!key) {
    throw new Error(`No key found for environment "${env}". Run \`envault add ${env}\` first.`);
  }

  const envFilePath = path.join(projectDir, `.env.${env}`);

  if (!fs.existsSync(envFilePath)) {
    throw new Error(`Env file not found: ${envFilePath}`);
  }

  const watcher = fs.watch(envFilePath, async (event) => {
    if (event === "change") {
      try {
        await encryptEnvFile(envFilePath, key);
        if (onChange) onChange(event, envFilePath);
      } catch {
        // silently skip transient errors during write
      }
    }
  });

  return {
    watching: true,
    filePath: envFilePath,
    environment: env,
    stop: () => watcher.close(),
  };
}
