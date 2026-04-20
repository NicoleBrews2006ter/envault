import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, beforeEach } from "vitest";
import { truncate } from "./truncate";
import { createDefaultConfig, writeConfig } from "../config/project";
import { encryptEnvFile, getEncryptedPath } from "../crypto/envfile";
import { writeKeys } from "../crypto/keyfile";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-truncate-"));
}

const TEST_PASSPHRASE = "test-passphrase-truncate";
const SAMPLE_CONTENTS = "KEY1=value1\nKEY2=value2\nKEY3=value3\nKEY4=value4\nKEY5=value5\n";

async function setupProject(dir: string, env = "production") {
  const config = createDefaultConfig("test-project", dir);
  config.environments = [env];
  writeConfig(dir, config);

  const encPath = getEncryptedPath(dir, env);
  await encryptEnvFile(SAMPLE_CONTENTS, encPath, TEST_PASSPHRASE);

  writeKeys({ [`test-project:${env}`]: { passphrase: TEST_PASSPHRASE, addedAt: new Date().toISOString() } });
}

describe("truncate", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  it("removes lines from the bottom by default", async () => {
    await setupProject(tmpDir);
    const result = await truncate(tmpDir, "production", { lines: 2 });
    expect(result.removed).toBe(2);
    expect(result.remaining).toBe(3);
  });

  it("removes lines from the top when specified", async () => {
    await setupProject(tmpDir);
    const result = await truncate(tmpDir, "production", { lines: 1, from: "top" });
    expect(result.removed).toBe(1);
    expect(result.remaining).toBe(4);
  });

  it("does not remove more lines than exist", async () => {
    await setupProject(tmpDir);
    const result = await truncate(tmpDir, "production", { lines: 100, from: "top" });
    expect(result.removed).toBe(5);
    expect(result.remaining).toBe(0);
  });

  it("throws if project is not initialized", async () => {
    await expect(truncate(tmpDir, "production", { lines: 1 })).rejects.toThrow(
      "No envault project found"
    );
  });

  it("throws if environment does not exist", async () => {
    await setupProject(tmpDir);
    await expect(truncate(tmpDir, "staging", { lines: 1 })).rejects.toThrow(
      "Environment 'staging' does not exist"
    );
  });
});
