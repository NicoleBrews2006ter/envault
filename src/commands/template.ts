import * as fs from "fs";
import * as path from "path";
import { readConfig } from "../config/project";
import { readKeys } from "../crypto/keyfile";
import { decryptEnvFile, getEncryptedPath } from "../crypto/envfile";

export interface TemplateResult {
  output: string;
  missingKeys: string[];
}

/**
 * Renders a template string by substituting {{KEY}} placeholders
 * with values from the specified environment.
 */
export async function template(
  projectDir: string,
  environment: string,
  templateContent: string,
  outputPath?: string
): Promise<TemplateResult> {
  const config = await readConfig(projectDir);

  if (!config.environments.includes(environment)) {
    throw new Error(`Environment "${environment}" not found in project.`);
  }

  const encryptedPath = getEncryptedPath(projectDir, environment);
  if (!fs.existsSync(encryptedPath)) {
    throw new Error(`No encrypted file found for environment "${environment}".`);
  }

  const keys = await readKeys(projectDir);
  const passphrase = keys[environment];
  if (!passphrase) {
    throw new Error(`No key found for environment "${environment}". Run 'envault add' first.`);
  }

  const envContent = await decryptEnvFile(projectDir, environment, passphrase);
  const envVars = parseEnvVars(envContent);

  const missingKeys: string[] = [];
  const output = templateContent.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (match, key) => {
    if (key in envVars) {
      return envVars[key];
    }
    missingKeys.push(key);
    return match;
  });

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, output, "utf-8");
  }

  return { output, missingKeys };
}

function parseEnvVars(content: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    vars[key] = value;
  }
  return vars;
}
