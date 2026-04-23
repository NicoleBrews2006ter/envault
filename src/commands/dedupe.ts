import * as fs from "fs";
import * as path from "path";
import { configExists, readConfig } from "../config/project";
import { decryptEnvFile, getEncryptedPath, encryptEnvFile } from "../crypto/envfile";
import { readKeys } from "../crypto/keyfile";

export interface DedupeResult {
  environment: string;
  removed: string[];
  kept: string[];
}

/**
 * Parse env contents into an ordered list of [key, line] pairs,
 * preserving comments and blank lines as-is.
 */
function parseLines(contents: string): Array<{ key: string | null; line: string }> {
  return contents.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return { key: null, line };
    }
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) {
      return { key: null, line };
    }
    const key = line.slice(0, eqIdx).trim();
    return { key, line };
  });
}

/**
 * Remove duplicate keys from an env file, keeping the last occurrence
 * of each key (last-write-wins semantics).
 */
export function dedupeEnvContents(contents: string): {
  deduped: string;
  removed: string[];
} {
  const lines = parseLines(contents);

  // Find the last occurrence index for each key
  const lastIndex = new Map<string, number>();
  lines.forEach(({ key }, idx) => {
    if (key !== null) {
      lastIndex.set(key, idx);
    }
  });

  const removed: string[] = [];
  const kept: string[] = [];

  const resultLines = lines
    .filter(({ key }, idx) => {
      if (key === null) return true; // keep comments/blanks
      if (lastIndex.get(key) === idx) {
        kept.push(key);
        return true;
      }
      // Only record first removal of each key
      if (!removed.includes(key)) {
        removed.push(key);
      }
      return false;
    })
    .map(({ line }) => line);

  return {
    deduped: resultLines.join("\n"),
    removed,
  };
}

/**
 * Deduplicate keys in one or more encrypted environment files.
 * Reads, deduplicates, and re-encrypts each file in place.
 */
export async function dedupe(
  projectDir: string,
  environments: string[]
): Promise<DedupeResult[]> {
  if (!configExists(projectDir)) {
    throw new Error("No envault project found. Run `envault init` first.");
  }

  const config = readConfig(projectDir);
  const keys = readKeys();
  const results: DedupeResult[] = [];

  const envsToProcess =
    environments.length > 0 ? environments : config.environments;

  for (const env of envsToProcess) {
    if (!config.environments.includes(env)) {
      throw new Error(`Environment "${env}" does not exist in this project.`);
    }

    const encryptedPath = getEncryptedPath(projectDir, env);
    if (!fs.existsSync(encryptedPath)) {
      throw new Error(
        `Encrypted file for environment "${env}" not found. Run \`envault lock ${env}\` first.`
      );
    }

    const keyEntry = keys[`${config.name}:${env}`];
    if (!keyEntry) {
      throw new Error(
        `No key found for environment "${env}". You may not have access.`
      );
    }

    // Decrypt, deduplicate, re-encrypt
    const contents = await decryptEnvFile(encryptedPath, keyEntry.passphrase);
    const { deduped, removed } = dedupeEnvContents(contents);

    if (removed.length > 0) {
      await encryptEnvFile(deduped, encryptedPath, keyEntry.passphrase);
    }

    const kept = Array.from(
      new Set(
        parseLines(deduped)
          .filter((l) => l.key !== null)
          .map((l) => l.key as string)
      )
    );

    results.push({ environment: env, removed, kept });
  }

  return results;
}
