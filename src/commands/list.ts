import * as path from "path";
import * as fs from "fs";
import { readConfig, configExists } from "../config/project";
import { readKeys } from "../crypto/keyfile";
import { getEncryptedPath } from "../crypto/envfile";

export interface ListResult {
  environments: EnvironmentInfo[];
}

export interface EnvironmentInfo {
  name: string;
  hasKey: boolean;
  isLocked: boolean;
  encryptedPath: string;
}

export async function listEnvironments(projectDir: string): Promise<ListResult> {
  if (!configExists(projectDir)) {
    throw new Error(
      "No envault config found. Run `envault init` to initialize."
    );
  }

  const config = readConfig(projectDir);
  const keys = readKeys();

  const environments: EnvironmentInfo[] = config.environments.map((envName) => {
    const encryptedPath = getEncryptedPath(projectDir, envName);
    const isLocked = !fs.existsSync(path.join(projectDir, `.env.${envName}`)) &&
      fs.existsSync(encryptedPath);
    const hasKey = !!keys[`${config.projectId}:${envName}`];

    return {
      name: envName,
      hasKey,
      isLocked,
      encryptedPath,
    };
  });

  return { environments };
}
