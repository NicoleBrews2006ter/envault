import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sync } from "./sync";
import { writeConfig } from "../config/project";
import { storeKey } from "../crypto/keyfile";
import { encryptEnvFile, getEncryptedPath } from "../crypto/envfile";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-sync-"));
}

vi.mock("../crypto/keyfile", () => ({
  readKeys: vi.fn(),
  storeKey: vi.fn(),
}));

vi.mock("../crypto/envfile", () => ({
  encryptEnvFile: vi.fn(),
  decryptEnvFile: vi.fn(),
  getEncryptedPath: vi.fn((p: string) => p + ".enc"),
}));

import { readKeys } from "../crypto/keyfile";
import { decryptEnvFile } from "../crypto/envfile";

describe("sync", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = makeTempDir();
    await writeConfig(tmpDir, { project: "myapp", environments: ["development", "staging"] });
    vi.mocked(readKeys).mockResolvedValue({
      "myapp:development": "key-dev",
      "myapp:staging": "key-stg",
    });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it("locks all environments with existing .env files", async () => {
    fs.writeFileSync(path.join(tmpDir, ".env.development"), "FOO=bar");
    fs.writeFileSync(path.join(tmpDir, ".env.staging"), "FOO=baz");
    const results = await sync(tmpDir, "lock");
    expect(results.filter(r => r.action === "locked")).toHaveLength(2);
    expect(encryptEnvFile).toHaveBeenCalledTimes(2);
  });

  it("skips environments with missing .env files during lock", async () => {
    fs.writeFileSync(path.join(tmpDir, ".env.development"), "FOO=bar");
    const results = await sync(tmpDir, "lock");
    expect(results.find(r => r.environment === "staging")?.action).toBe("skipped");
  });

  it("unlocks environments with existing encrypted files", async () => {
    fs.writeFileSync(path.join(tmpDir, ".env.development.enc"), "encrypted");
    fs.writeFileSync(path.join(tmpDir, ".env.staging.enc"), "encrypted");
    const results = await sync(tmpDir, "unlock");
    expect(results.filter(r => r.action === "unlocked")).toHaveLength(2);
    expect(decryptEnvFile).toHaveBeenCalledTimes(2);
  });

  it("skips environments with no key found", async () => {
    vi.mocked(readKeys).mockResolvedValue({});
    const results = await sync(tmpDir, "lock");
    expect(results.every(r => r.action === "skipped")).toBe(true);
    expect(results[0].reason).toBe("no key found");
  });
});
