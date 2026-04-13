import * as fs from "fs";
import * as path from "path";
import { readConfig } from "../config/project";
import { readKeys } from "../crypto/keyfile";
import { getEncryptedPath } from "../crypto/envfile";

export interface AuditResult {
  environment: string;
  hasEncryptedFile: boolean;
  hasKey: boolean;
  encryptedFilePath: string;
  lastModified: Date | null;
}

export interface AuditReport {
  projectName: string;
  configPath: string;
  environments: AuditResult[];
  totalEnvironments: number;
  healthyEnvironments: number;
  missingKeys: string[];
  missingFiles: string[];
}

export async function auditProject(cwd: string = process.cwd()): Promise<AuditReport> {
  const config = await readConfig(cwd);
  const keys = await readKeys(config.projectId);

  const environments = config.environments || [];
  const results: AuditResult[] = [];
  const missingKeys: string[] = [];
  const missingFiles: string[] = [];

  for (const env of environments) {
    const encryptedPath = getEncryptedPath(cwd, env);
    const hasEncryptedFile = fs.existsSync(encryptedPath);
    const hasKey = env in keys;

    let lastModified: Date | null = null;
    if (hasEncryptedFile) {
      const stat = fs.statSync(encryptedPath);
      lastModified = stat.mtime;
    }

    if (!hasKey) missingKeys.push(env);
    if (!hasEncryptedFile) missingFiles.push(env);

    results.push({
      environment: env,
      hasEncryptedFile,
      hasKey,
      encryptedFilePath: encryptedPath,
      lastModified,
    });
  }

  const healthyEnvironments = results.filter(
    (r) => r.hasEncryptedFile && r.hasKey
  ).length;

  return {
    projectName: config.projectId,
    configPath: path.join(cwd, ".envault.json"),
    environments: results,
    totalEnvironments: environments.length,
    healthyEnvironments,
    missingKeys,
    missingFiles,
  };
}
