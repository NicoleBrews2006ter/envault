import * as fs from "fs";
import * as path from "path";
import { readConfig } from "../config/project";
import { readKeys, writeKeys } from "../crypto/keyfile";
import { getEncryptedPath } from "../crypto/envfile";

export interface RemoveOptions {
  projectDir?: string;
  force?: boolean;
}

export interface RemoveResult {
  environment: string;
  removedKey: boolean;
  removedFile: boolean;
}

export async function removeEnvironment(
  environment: string,
  options: RemoveOptions = {}
): Promise<RemoveResult> {
  const projectDir = options.projectDir ?? process.cwd();
  const config = await readConfig(projectDir);

  if (!config.environments.includes(environment)) {
    throw new Error(
      `Environment "${environment}" does not exist in this project.`
    );
  }

  const keys = await readKeys(projectDir);
  let removedKey = false;
  if (keys[environment]) {
    delete keys[environment];
    await writeKeys(projectDir, keys);
    removedKey = true;
  }

  const encryptedPath = getEncryptedPath(projectDir, environment);
  let removedFile = false;
  if (fs.existsSync(encryptedPath)) {
    fs.unlinkSync(encryptedPath);
    removedFile = true;
  }

  config.environments = config.environments.filter((e) => e !== environment);

  const configPath = path.join(projectDir, ".envault.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

  return { environment, removedKey, removedFile };
}
