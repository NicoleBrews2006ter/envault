import * as fs from "fs";
import * as path from "path";
import { configExists, readConfig } from "../config/project";
import { readKeys } from "../crypto/keyfile";
import { getEncryptedPath } from "../crypto/envfile";

export interface DoctorCheck {
  name: string;
  passed: boolean;
  message: string;
}

export interface DoctorResult {
  checks: DoctorCheck[];
  allPassed: boolean;
}

export async function doctor(cwd: string): Promise<DoctorResult> {
  const checks: DoctorCheck[] = [];

  // Check 1: config file exists
  const cfgExists = await configExists(cwd);
  checks.push({
    name: "Config file",
    passed: cfgExists,
    message: cfgExists
      ? ".envault.json found"
      : ".envault.json not found — run `envault init`",
  });

  if (!cfgExists) {
    return { checks, allPassed: false };
  }

  // Check 2: config is valid JSON with required fields
  let config: any = null;
  try {
    config = await readConfig(cwd);
    checks.push({
      name: "Config validity",
      passed: true,
      message: "Config is valid",
    });
  } catch {
    checks.push({
      name: "Config validity",
      passed: false,
      message: "Config file is malformed or unreadable",
    });
    return { checks, allPassed: false };
  }

  // Check 3: at least one environment exists
  const envs: string[] = config.environments ?? [];
  const hasEnvs = envs.length > 0;
  checks.push({
    name: "Environments defined",
    passed: hasEnvs,
    message: hasEnvs
      ? `${envs.length} environment(s) defined`
      : "No environments found — run `envault add`",
  });

  // Check 4: keyfile readable
  let keys: Record<string, string> = {};
  try {
    keys = await readKeys();
    checks.push({
      name: "Key store",
      passed: true,
      message: "Key store is accessible",
    });
  } catch {
    checks.push({
      name: "Key store",
      passed: false,
      message: "Key store is missing or unreadable — keys may be lost",
    });
  }

  // Check 5: each environment has a stored key
  for (const env of envs) {
    const keyId = `${config.projectId}:${env}`;
    const hasKey = keyId in keys;
    checks.push({
      name: `Key for "${env}"`,
      passed: hasKey,
      message: hasKey
        ? `Key found for environment "${env}"`
        : `No key found for environment "${env}" — re-add or import`,
    });
  }

  // Check 6: encrypted files exist on disk
  for (const env of envs) {
    const encPath = getEncryptedPath(cwd, env);
    const exists = fs.existsSync(encPath);
    checks.push({
      name: `Encrypted file for "${env}"`,
      passed: exists,
      message: exists
        ? `${path.basename(encPath)} exists`
        : `${path.basename(encPath)} missing — run \`envault lock ${env}\``,
    });
  }

  const allPassed = checks.every((c) => c.passed);
  return { checks, allPassed };
}
