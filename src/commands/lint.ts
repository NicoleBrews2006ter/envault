import * as fs from "fs";
import * as path from "path";
import { readConfig } from "../config/project";
import { getEncryptedPath, decryptEnvFile } from "../crypto/envfile";
import { readKeys } from "../crypto/keyfile";

export interface LintIssue {
  key: string;
  message: string;
  severity: "error" | "warning";
}

export interface LintResult {
  environment: string;
  issues: LintIssue[];
  valid: boolean;
}

const INVALID_KEY_PATTERN = /^[A-Z_][A-Z0-9_]*$/;
const EMPTY_VALUE_PATTERN = /^\s*$/;

function lintEnvContents(contents: Record<string, string>): LintIssue[] {
  const issues: LintIssue[] = [];
  for (const [key, value] of Object.entries(contents)) {
    if (!INVALID_KEY_PATTERN.test(key)) {
      issues.push({
        key,
        message: `Key "${key}" does not follow UPPER_SNAKE_CASE convention`,
        severity: "warning",
      });
    }
    if (EMPTY_VALUE_PATTERN.test(value)) {
      issues.push({
        key,
        message: `Key "${key}" has an empty or whitespace-only value`,
        severity: "warning",
      });
    }
  }
  return issues;
}

export async function lint(
  projectDir: string,
  environment?: string
): Promise<LintResult[]> {
  const config = await readConfig(projectDir);
  const keys = await readKeys();

  const envs = environment
    ? config.environments.filter((e) => e === environment)
    : config.environments;

  if (environment && envs.length === 0) {
    throw new Error(`Environment "${environment}" not found`);
  }

  const results: LintResult[] = [];

  for (const env of envs) {
    const encryptedPath = getEncryptedPath(projectDir, env);
    if (!fs.existsSync(encryptedPath)) {
      results.push({ environment: env, issues: [], valid: true });
      continue;
    }

    const keyEntry = keys[`${path.resolve(projectDir)}:${env}`];
    if (!keyEntry) {
      results.push({
        environment: env,
        issues: [{ key: "*", message: "No key found for environment", severity: "error" }],
        valid: false,
      });
      continue;
    }

    const contents = await decryptEnvFile(projectDir, env, keyEntry.passphrase);
    const issues = lintEnvContents(contents);
    results.push({ environment: env, issues, valid: issues.every((i) => i.severity !== "error") });
  }

  return results;
}
