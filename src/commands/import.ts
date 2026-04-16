import * as fs from "fs";
import * as path from "path";
import { readConfig, configExists, writeConfig } from "../config/project";
import { readKeys } from "../crypto/keyfile";
import { encryptEnvFile, getEncryptedPath } from "../crypto/envfile";

export interface ImportOptions {
  environment?: string;
  force?: boolean;
}

export async function importEnvFile(
  filePath: string,
  options: ImportOptions = {}
): Promise<{ environment: string; encryptedPath: string }> {
  const cwd = process.cwd();

  if (!configExists(cwd)) {
    throw new Error(
      "No envault config found. Run `envault init` first."
    );
  }

  const config = readConfig(cwd);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const environment =
    options.environment ??
    path.basename(filePath).replace(/^\.env\.?/, "") ||
    "default";

  if (config.environments.includes(environment) && !options.force) {
    throw new Error(
      `Environment "${environment}" already exists. Use --force to overwrite.`
    );
  }

  const keys = readKeys();
  const projectKey = keys[config.projectId];

  if (!projectKey) {
    throw new Error(
      `No key found for project "${config.projectId}". Run \`envault add\` to set up access.`
    );
  }

  const contents = fs.readFileSync(filePath, "utf-8");

  if (contents.trim().length === 0) {
    throw new Error(`File is empty: ${filePath}`);
  }

  const encryptedPath = getEncryptedPath(cwd, environment);

  await encryptEnvFile(contents, encryptedPath, projectKey);

  if (!config.environments.includes(environment)) {
    config.environments.push(environment);
    writeConfig(cwd, config);
  }

  return { environment, encryptedPath };
}
