import * as fs from "fs";
import * as path from "path";
import { readConfig, configExists } from "../config/project";
import { read } from "../crypto/keyfile";
import { decryptEnvFile, getEncryptedPath } from "../crypto/envfile";

export interface EnvResult {
  environment: string;
  variables: Record<string, string>;
}

export async function env(
  projectDir: string,
  environment: string,
  format: "export" | "dotenv" | "json" = "dotenv"
): Promise<EnvResult> {
  if (!configExists(projectDir)) {
    throw new Error("No envault project found. Run 'envault init' first.");
  }

  const config = readConfig(projectDir);
  if (!config.environments.includes(environment)) {
    throw new Error(
      `Environment '${environment}' not found. Available: ${config.environments.join(", ")}`
    );
  }

  const encryptedPath = getEncryptedPath(projectDir, environment);
  if (!fs.existsSync(encryptedPath)) {
    throw new Error(
      `No encrypted file found for environment '${environment}'. Run 'envault lock ${environment}' first.`
    );
  }

  const keys = readKeys(projectDir);
  const key = keys[environment];
  if (!key) {
    throw new Error(
      `No key found for environment '${environment}'. You may not have access.`
    );
  }

  const decrypted = await decryptEnvFile(projectDir, environment, key);
  const variables = parseVariables(decrypted);

  return { environment, variables };
}

export function formatEnvOutput(
  variables: Record<string, string>,
  format: "export" | "dotenv" | "json"
): string {
  if (format === "json") {
    return JSON.stringify(variables, null, 2);
  }
  const prefix = format === "export" ? "export " : "";
  return Object.entries(variables)
    .map(([k, v]) => `${prefix}${k}=${JSON.stringify(v)}`)
    .join("\n");
}

function parseVariables(content: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) vars[key] = value;
  }
  return vars;
}
