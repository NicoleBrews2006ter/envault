import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { lint } from "./lint";
import { createDefaultConfig, writeConfig } from "../config/project";
import { encryptEnvFile } from "../crypto/envfile";
import { storeKey, generatePassphrase } from "../crypto/keyfile";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-lint-"));
}

describe("lint", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns no issues for well-formed env file", async () => {
    const config = createDefaultConfig();
    config.environments = ["production"];
    await writeConfig(tmpDir, config);

    const passphrase = generatePassphrase();
    await storeKey(tmpDir, "production", passphrase);
    await encryptEnvFile(tmpDir, "production", { DATABASE_URL: "postgres://localhost/db", API_KEY: "secret" }, passphrase);

    const results = await lint(tmpDir, "production");
    expect(results).toHaveLength(1);
    expect(results[0].issues).toHaveLength(0);
    expect(results[0].valid).toBe(true);
  });

  it("warns about lowercase keys", async () => {
    const config = createDefaultConfig();
    config.environments = ["staging"];
    await writeConfig(tmpDir, config);

    const passphrase = generatePassphrase();
    await storeKey(tmpDir, "staging", passphrase);
    await encryptEnvFile(tmpDir, "staging", { database_url: "postgres://localhost/db" }, passphrase);

    const results = await lint(tmpDir, "staging");
    expect(results[0].issues.some((i) => i.key === "database_url" && i.severity === "warning")).toBe(true);
  });

  it("warns about empty values", async () => {
    const config = createDefaultConfig();
    config.environments = ["development"];
    await writeConfig(tmpDir, config);

    const passphrase = generatePassphrase();
    await storeKey(tmpDir, "development", passphrase);
    await encryptEnvFile(tmpDir, "development", { API_SECRET: "" }, passphrase);

    const results = await lint(tmpDir, "development");
    expect(results[0].issues.some((i) => i.key === "API_SECRET" && i.severity === "warning")).toBe(true);
  });

  it("throws when environment does not exist", async () => {
    const config = createDefaultConfig();
    config.environments = ["production"];
    await writeConfig(tmpDir, config);

    await expect(lint(tmpDir, "nonexistent")).rejects.toThrow('Environment "nonexistent" not found');
  });
});
