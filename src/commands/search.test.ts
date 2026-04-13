import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { search } from "./search";
import { createDefaultConfig, writeConfig } from "../config/project";
import { storeKey, generatePassphrase } from "../crypto/keyfile";
import { encryptEnvFile } from "../crypto/envfile";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-search-test-"));
}

describe("search", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig();
    config.environments["production"] = { description: "Production" };
    writeConfig(tmpDir, config);

    const passphrase = generatePassphrase();
    storeKey(tmpDir, "development", passphrase);
    storeKey(tmpDir, "production", passphrase);

    await encryptEnvFile(tmpDir, "development", "DATABASE_URL=postgres://localhost\nAPI_KEY=secret123\n", passphrase);
    await encryptEnvFile(tmpDir, "production", "DATABASE_URL=postgres://prod-host\nAPI_SECRET=topsecret\n", passphrase);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("finds matches by key", async () => {
    const matches = await search(tmpDir, "DATABASE", { keys: true, values: false });
    expect(matches.length).toBe(2);
    expect(matches.every((m) => m.key === "DATABASE_URL")).toBe(true);
  });

  it("finds matches by value", async () => {
    const matches = await search(tmpDir, "secret", { keys: false, values: true });
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("is case-insensitive by default", async () => {
    const matches = await search(tmpDir, "database_url");
    expect(matches.length).toBe(2);
  });

  it("respects caseSensitive option", async () => {
    const matches = await search(tmpDir, "database_url", { caseSensitive: true });
    expect(matches.length).toBe(0);
  });

  it("throws if project not initialized", async () => {
    await expect(search("/nonexistent", "KEY")).rejects.toThrow("No envault project found");
  });
});
