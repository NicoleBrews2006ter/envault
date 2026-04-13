import * as fs from "fs";
import * as path from "path";
import { configExists, readConfig } from "../config/project";
import { readKeys } from "../crypto/keyfile";
import { decryptEnvFile, getEncryptedPath } from "../crypto/envfile";

export interface SearchMatch {
  environment: string;
  key: string;
  value: string;
}

export interface SearchOptions {
  keys?: boolean;
  values?: boolean;
  caseSensitive?: boolean;
}

export async function search(
  projectDir: string,
  query: string,
  options: SearchOptions = {}
): Promise<SearchMatch[]> {
  if (!configExists(projectDir)) {
    throw new Error("No envault project found. Run `envault init` first.");
  }

  const config = readConfig(projectDir);
  const environments = Object.keys(config.environments);

  if (environments.length === 0) {
    throw new Error("No environments found.");
  }

  const searchKeys = options.keys !== false;
  const searchValues = options.values !== false;
  const flags = options.caseSensitive ? "" : "i";
  const regex = new RegExp(query, flags);

  const matches: SearchMatch[] = [];

  for (const env of environments) {
    const encryptedPath = getEncryptedPath(projectDir, env);
    if (!fs.existsSync(encryptedPath)) continue;

    const keys = readKeys(projectDir);
    const keyEntry = keys[env];
    if (!keyEntry) continue;

    try {
      const decrypted = await decryptEnvFile(projectDir, env, keyEntry.passphrase);
      const lines = decrypted.split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;

        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();

        const keyMatches = searchKeys && regex.test(key);
        const valueMatches = searchValues && regex.test(value);

        if (keyMatches || valueMatches) {
          matches.push({ environment: env, key, value });
        }
      }
    } catch {
      // skip environments we can't decrypt
    }
  }

  return matches;
}
