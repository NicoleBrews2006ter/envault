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

/**
 * Lists all environments configured for the project, along with their
 * lock status and whether the current user has a decryption key for each.
 *
 * @param projectDir - Absolute path to the project root directory.
 * @returns An object containing metadata for each configured environment.
 * @throws If no envault config exists in the given directory.
 */
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
