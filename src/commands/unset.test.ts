import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { unset } from "./unset";
import { set } from "./set";
import { createDefaultConfig, writeConfig } from "../config/project";
import { writeKeys } from "../crypto/keyfile";
import { getEncryptedPath } from "../crypto/envfile";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-unset-"));
}

describe("unset", () => {
  let tmpDir: string;
  const projectId = "test-project-unset";
  const passphrase = "test-passphrase-unset";

  beforeEach(() => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig(projectId);
    config.environments = ["development"];
    writeConfig(tmpDir, config);
    writeKeys({ [projectId]: passphrase });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("throws if project not initialized", async () => {
    const emptyDir = makeTempDir();
    try {
      await expect(unset("development", "FOO", { projectDir: emptyDir })).rejects.toThrow(
        "No envault project found"
      );
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it("throws if environment does not exist", async () => {
    await expect(unset("staging", "FOO", { projectDir: tmpDir })).rejects.toThrow(
      'Environment "staging" does not exist'
    );
  });

  it("returns false if encrypted file does not exist", async () => {
    const result = await unset("development", "FOO", { projectDir: tmpDir });
    expect(result).toBe(false);
  });

  it("returns false if key not present in file", async () => {
    await set("development", "OTHER", "value", { projectDir: tmpDir });
    const result = await unset("development", "MISSING", { projectDir: tmpDir });
    expect(result).toBe(false);
  });

  it("removes an existing key and returns true", async () => {
    await set("development", "API_KEY", "secret", { projectDir: tmpDir });
    await set("development", "DB_URL", "postgres://localhost", { projectDir: tmpDir });
    const result = await unset("development", "API_KEY", { projectDir: tmpDir });
    expect(result).toBe(true);
  });

  it("encrypted file still exists after removing one of many keys", async () => {
    await set("development", "A", "1", { projectDir: tmpDir });
    await set("development", "B", "2", { projectDir: tmpDir });
    await unset("development", "A", { projectDir: tmpDir });
    const encPath = getEncryptedPath(tmpDir, "development");
    expect(fs.existsSync(encPath)).toBe(true);
  });
});
