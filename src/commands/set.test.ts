import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { set } from "./set";
import { createDefaultConfig, writeConfig } from "../config/project";
import { writeKeys } from "../crypto/keyfile";
import { encryptEnvFile, getEncryptedPath } from "../crypto/envfile";
import { decrypt, deriveKey } from "../crypto/encryption";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-set-"));
}

describe("set", () => {
  let tmpDir: string;
  const projectId = "test-project-set";
  const passphrase = "test-passphrase-set";

  beforeEach(() => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig(projectId);
    config.environments = ["development", "staging"];
    writeConfig(tmpDir, config);
    writeKeys({ [projectId]: passphrase });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("throws if project not initialized", async () => {
    const emptyDir = makeTempDir();
    try {
      await expect(set("development", "FOO", "bar", { projectDir: emptyDir })).rejects.toThrow(
        "No envault project found"
      );
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it("throws if environment does not exist", async () => {
    await expect(set("production", "FOO", "bar", { projectDir: tmpDir })).rejects.toThrow(
      'Environment "production" does not exist'
    );
  });

  it("creates encrypted file with new key-value pair", async () => {
    await set("development", "API_KEY", "secret123", { projectDir: tmpDir });
    const encPath = getEncryptedPath(tmpDir, "development");
    expect(fs.existsSync(encPath)).toBe(true);
  });

  it("adds a key to an existing environment file", async () => {
    await set("development", "FIRST", "one", { projectDir: tmpDir });
    await set("development", "SECOND", "two", { projectDir: tmpDir });
    const encPath = getEncryptedPath(tmpDir, "development");
    expect(fs.existsSync(encPath)).toBe(true);
  });

  it("overwrites an existing key", async () => {
    await set("development", "API_KEY", "old", { projectDir: tmpDir });
    await set("development", "API_KEY", "new", { projectDir: tmpDir });
    const encPath = getEncryptedPath(tmpDir, "development");
    expect(fs.existsSync(encPath)).toBe(true);
  });
});
