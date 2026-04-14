import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { watch } from "./watch";
import { createDefaultConfig, writeConfig } from "../config/project";
import { writeKeys } from "../crypto/keyfile";
import { generatePassphrase } from "../crypto/keyfile";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-watch-"));
}

describe("watch", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("throws if no config exists", async () => {
    await expect(watch({ environment: "development", projectDir: tmpDir })).rejects.toThrow(
      "No envault project found"
    );
  });

  it("throws if environment does not exist", async () => {
    const config = createDefaultConfig("test-project");
    writeConfig(tmpDir, config);
    await expect(watch({ environment: "staging", projectDir: tmpDir })).rejects.toThrow(
      'Environment "staging" does not exist'
    );
  });

  it("throws if no key found for environment", async () => {
    const config = createDefaultConfig("test-project");
    config.environments = ["development"];
    writeConfig(tmpDir, config);
    vi.mock("../crypto/keyfile", async (importOriginal) => {
      const mod = await importOriginal<typeof import("../crypto/keyfile")>();
      return { ...mod, readKeys: () => ({}) };
    });
    await expect(watch({ environment: "development", projectDir: tmpDir })).rejects.toThrow(
      "No key found"
    );
  });

  it("throws if env file does not exist", async () => {
    const config = createDefaultConfig("test-project");
    config.environments = ["development"];
    writeConfig(tmpDir, config);
    vi.spyOn(await import("../crypto/keyfile"), "readKeys").mockReturnValue({
      "test-project:development": "mockkey",
    });
    await expect(watch({ environment: "development", projectDir: tmpDir })).rejects.toThrow(
      "Env file not found"
    );
  });

  it("returns a watcher with stop function when env file exists", async () => {
    const config = createDefaultConfig("test-project");
    config.environments = ["development"];
    writeConfig(tmpDir, config);
    vi.spyOn(await import("../crypto/keyfile"), "readKeys").mockReturnValue({
      "test-project:development": "mockkey",
    });
    vi.spyOn(await import("../crypto/envfile"), "encryptEnvFile").mockResolvedValue(undefined as any);
    const envFile = path.join(tmpDir, ".env.development");
    fs.writeFileSync(envFile, "KEY=value");
    const result = await watch({ environment: "development", projectDir: tmpDir });
    expect(result.watching).toBe(true);
    expect(result.environment).toBe("development");
    expect(typeof result.stop).toBe("function");
    result.stop();
  });
});
