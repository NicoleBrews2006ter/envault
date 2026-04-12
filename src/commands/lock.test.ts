import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { lockEnv } from "./lock";
import { createDefaultConfig, writeConfig } from "../config/project";
import { writeKeys } from "../crypto/keyfile";
import { generatePassphrase } from "../crypto/keyfile";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-lock-test-"));
}

describe("lockEnv", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns error if config does not exist", async () => {
    const result = await lockEnv(tmpDir);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/envault init/);
  });

  it("returns error if env name not registered", async () => {
    const config = createDefaultConfig("test-project");
    writeConfig(tmpDir, config);
    const result = await lockEnv(tmpDir, "default");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/envault add/);
  });

  it("returns error if .env file is missing", async () => {
    const config = createDefaultConfig("test-project");
    config.envFiles = { default: ".env" };
    writeConfig(tmpDir, config);
    const passphrase = generatePassphrase();
    writeKeys({ [config.projectId]: passphrase });
    const result = await lockEnv(tmpDir, "default");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/);
  });

  it("encrypts the env file successfully", async () => {
    const config = createDefaultConfig("test-project");
    config.envFiles = { default: ".env" };
    writeConfig(tmpDir, config);
    const passphrase = generatePassphrase();
    writeKeys({ [config.projectId]: passphrase });
    fs.writeFileSync(path.join(tmpDir, ".env"), "SECRET=hello\nDB=postgres");
    const result = await lockEnv(tmpDir, "default");
    expect(result.success).toBe(true);
    expect(result.encryptedPath).toBeDefined();
    expect(fs.existsSync(result.encryptedPath!)).toBe(true);
  });
});
