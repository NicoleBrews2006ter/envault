import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mergeEnvironments } from "./merge";
import { createDefaultConfig, writeConfig } from "../config/project";
import { encryptEnvFile, getEncryptedPath } from "../crypto/envfile";
import { storeKey } from "../crypto/keyfile";
import { generatePassphrase } from "../crypto/keyfile";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-merge-test-"));
}

describe("mergeEnvironments", () => {
  let tmpDir: string;
  let devKey: string;
  let stagingKey: string;
  const projectName = "envault-merge-test";

  beforeEach(async () => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig();
    config.environments["development"] = { description: "Dev" };
    config.environments["staging"] = { description: "Staging" };
    await writeConfig(config, tmpDir);

    devKey = generatePassphrase();
    stagingKey = generatePassphrase();

    const baseName = path.basename(tmpDir);
    await storeKey(`${baseName}:development`, devKey);
    await storeKey(`${baseName}:staging`, stagingKey);

    await encryptEnvFile("API_URL=http://localhost\nDEBUG=true", "development", devKey, tmpDir);
    await encryptEnvFile("API_URL=https://staging.example.com\nDB_HOST=db.staging", "staging", stagingKey, tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("merges new keys from source into target", async () => {
    const result = await mergeEnvironments("development", "staging", tmpDir, false);
    expect(result.merged).toBe(1);
    expect(result.conflicts).toContain("API_URL");
    expect(result.outputEnvironment).toBe("staging");
  });

  it("overwrites conflicting keys when overwrite=true", async () => {
    const result = await mergeEnvironments("development", "staging", tmpDir, true);
    expect(result.merged).toBeGreaterThanOrEqual(1);
    expect(result.conflicts).toHaveLength(0);
  });

  it("throws if source environment does not exist", async () => {
    await expect(
      mergeEnvironments("nonexistent", "staging", tmpDir)
    ).rejects.toThrow('Source environment "nonexistent" does not exist');
  });

  it("throws if target environment does not exist", async () => {
    await expect(
      mergeEnvironments("development", "nonexistent", tmpDir)
    ).rejects.toThrow('Target environment "nonexistent" does not exist');
  });
});
