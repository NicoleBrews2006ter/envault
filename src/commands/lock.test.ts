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

/**
 * Sets up a temp directory with a valid config and keyfile for the given env name.
 * Optionally writes a .env file with the provided content.
 */
function setupEnvProject(
  tmpDir: string,
  envContent?: string
): { passphrase: string; envPath: string } {
  const config = createDefaultConfig("test-project");
  config.envFiles = { default: ".env" };
  writeConfig(tmpDir, config);
  const passphrase = generatePassphrase();
  writeKeys({ [config.projectId]: passphrase });
  const envPath = path.join(tmpDir, ".env");
  if (envContent !== undefined) {
    fs.writeFileSync(envPath, envContent);
  }
  return { passphrase, envPath };
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
    setupEnvProject(tmpDir);
    const result = await lockEnv(tmpDir, "default");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/);
  });

  it("encrypts the env file successfully", async () => {
    setupEnvProject(tmpDir, "SECRET=hello\nDB=postgres");
    const result = await lockEnv(tmpDir, "default");
    expect(result.success).toBe(true);
    expect(result.encryptedPath).toBeDefined();
    expect(fs.existsSync(result.encryptedPath!)).toBe(true);
  });
});
