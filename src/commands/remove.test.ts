import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { removeEnvironment } from "./remove";
import { createDefaultConfig, writeConfig } from "../config/project";
import { writeKeys } from "../crypto/keyfile";
import { getEncryptedPath } from "../crypto/envfile";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-remove-test-"));
}

describe("removeEnvironment", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig("test-project");
    config.environments = ["development", "staging"];
    writeConfig(tmpDir, config);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("removes an environment from the config", async () => {
    const result = await removeEnvironment("staging", { projectDir: tmpDir });
    expect(result.environment).toBe("staging");

    const configRaw = fs.readFileSync(
      path.join(tmpDir, ".envault.json"),
      "utf-8"
    );
    const config = JSON.parse(configRaw);
    expect(config.environments).not.toContain("staging");
    expect(config.environments).toContain("development");
  });

  it("removes the key from keyfile if present", async () => {
    const envaultDir = path.join(tmpDir, ".envault");
    fs.mkdirSync(envaultDir, { recursive: true });
    await writeKeys(tmpDir, { staging: "some-passphrase" });

    const result = await removeEnvironment("staging", { projectDir: tmpDir });
    expect(result.removedKey).toBe(true);
  });

  it("removes the encrypted file if present", async () => {
    const encryptedPath = getEncryptedPath(tmpDir, "staging");
    fs.mkdirSync(path.dirname(encryptedPath), { recursive: true });
    fs.writeFileSync(encryptedPath, "dummy", "utf-8");

    const result = await removeEnvironment("staging", { projectDir: tmpDir });
    expect(result.removedFile).toBe(true);
    expect(fs.existsSync(encryptedPath)).toBe(false);
  });

  it("throws if environment does not exist", async () => {
    await expect(
      removeEnvironment("production", { projectDir: tmpDir })
    ).rejects.toThrow('Environment "production" does not exist');
  });
});
