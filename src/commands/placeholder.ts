import * as fs from 'fs';
import * as path from 'path';
import { readConfig } from '../config/project';
import { decryptEnvFile, getEncryptedPath } from '../crypto/envfile';
import { readKeys } from '../crypto/keyfile';

export interface PlaceholderResult {
  environment: string;
  outputPath: string;
  substituted: number;
  missing: string[];
}

/**
 * Replaces {{VAR}} placeholders in a template file using values from a
 * decrypted environment, writing the result to an output file.
 */
export async function placeholder(
  templatePath: string,
  environment: string,
  outputPath: string,
  projectDir: string = process.cwd()
): Promise<PlaceholderResult> {
  const config = await readConfig(projectDir);

  if (!config.environments.includes(environment)) {
    throw new Error(`Environment "${environment}" not found in project`);
  }

  const encryptedPath = getEncryptedPath(projectDir, environment);
  if (!fs.existsSync(encryptedPath)) {
    throw new Error(`No encrypted file found for environment "${environment}"`);
  }

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }

  const keys = await readKeys();
  const projectKey = keys[config.name]?.[environment];
  if (!projectKey) {
    throw new Error(`No key found for environment "${environment}". Run 'envault add' first.`);
  }

  const envContents = await decryptEnvFile(encryptedPath, projectKey);

  // Parse env vars into a map
  const vars: Record<string, string> = {};
  for (const line of envContents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    vars[key] = value;
  }

  const template = fs.readFileSync(templatePath, 'utf-8');
  const missing: string[] = [];
  let substituted = 0;

  const result = template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, key) => {
    if (key in vars) {
      substituted++;
      return vars[key];
    }
    missing.push(key);
    return _match;
  });

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, result, 'utf-8');

  return { environment, outputPath, substituted, missing };
}
