import * as path from "path";
import { readConfig, configExists } from "../config/project";
import { readKeys } from "../crypto/keyfile";
import { getEncryptedPath } from "../crypto/envfile";
import * as fs from "fs";

export interface InfoResult {
  projectName: string;
  configPath: string;
  environments: EnvironmentInfo[];
}

export interface EnvironmentInfo {
  name: string;
  hasEncryptedFile: boolean;
  hasKey: boolean;
  encryptedFilePath: string;
}

export async function infoCommand(cwd: string = process.cwd()): Promise<InfoResult> {
  if (!configExists(cwd)) {
    throw new Error(
      "No envault project found. Run \`envault init\` to initialize."
    );
  }

  const config = readConfig(cwd);
  const configPath = path.join(cwd, ".envault.json");
  const keys = readKeys();

  const environments: EnvironmentInfo[] = config.environments.map((env) => {
    const encryptedFilePath = getEncryptedPath(cwd, env);
    const hasEncryptedFile = fs.existsSync(encryptedFilePath);
    const hasKey = !!keys[`${config.projectName}:${env}`];

    return {
      name: env,
      hasEncryptedFile,
      hasKey,
      encryptedFilePath,
    };
  });

  return {
    projectName: config.projectName,
    configPath,
    environments,
  };
}
