import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { importEnvFile } from "./import";
import { createDefaultConfig, writeConfig } from "../config/project";
import { writeKeys } from "../crypto/keyfile";
import { generatePassphrase } from "../crypto/keyfile";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-import-test-"));
}

describe("importEnvFile", () => {
  let tmpDir: string;
  let originalCwd: () => string;

  beforeEach(() => {
    tmpDir = makeTempDir();
    originalCwd = process.cwd;
    process.cwd = () => tmpDir;
  });

  afterEach(() => {
    process.cwd = originalCwd;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("throws if config does not exist", async () => {
    const envFile = path.join(tmpDir, ".env");
    fs.writeFileSync(envFile, "FOO=bar");
    await expect(importEnvFile(envFile)).rejects.toThrow(
      "No envault config found"
    );
  });

  it("throws if the file does not exist", async () => {
    const config = createDefaultConfig("test-project");
    writeConfig(tmpDir, config);
    await expect(
      importEnvFile(path.join(tmpDir, ".env.missing"))
    ).rejects.toThrow("File not found");
  });

  it("throws if environment already exists without --force", async () => {
    const passphrase = generatePassphrase();
    const config = createDefaultConfig("test-project");
    config.environments = ["staging"];
    writeConfig(tmpDir, config);
    writeKeys({ [config.projectId]: passphrase });

    const envFile = path.join(tmpDir, ".env.staging");
    fs.writeFileSync(envFile, "FOO=bar");

    await expect(importEnvFile(envFile, { environment: "staging" })).rejects.toThrow(
      'Environment "staging" already exists'
    );
  });

  it("imports a new env file and updates config", async () => {
    const passphrase = generatePassphrase();
    const config = createDefaultConfig("test-project");
    writeConfig(tmpDir, config);
    writeKeys({ [config.projectId]: passphrase });

    const envFile = path.join(tmpDir, ".env.production");
    fs.writeFileSync(envFile, "SECRET=abc123");

    const result = await importEnvFile(envFile, { environment: "production" });

    expect(result.environment).toBe("production");
    expect(fs.existsSync(result.encryptedPath)).toBe(true);

    const { readConfig } = await import("../config/project");
    const updatedConfig = readConfig(tmpDir);
    expect(updatedConfig.environments).toContain("production");
  });

  it("overwrites existing environment with --force", async () => {
    const passphrase = generatePassphrase();
    const config = createDefaultConfig("test-project");
    config.environments = ["staging"];
    writeConfig(tmpDir, config);
    writeKeys({ [config.projectId]: passphrase });

    const envFile = path.join(tmpDir, ".env.staging");
    fs.writeFileSync(envFile, "FOO=newvalue");

    const result = await importEnvFile(envFile, {
      environment: "staging",
      force: true,
    });

    expect(result.environment).toBe("staging");
    expect(fs.existsSync(result.encryptedPath)).toBe(true);
  });
});
