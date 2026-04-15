import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { env, formatEnvOutput } from "./env";
import { createDefaultConfig, writeConfig } from "../config/project";
import { writeKeys } from "../crypto/keyfile";
import { encryptEnvFile, getEncryptedPath } from "../crypto/envfile";
import { generatePassphrase } from "../crypto/keyfile";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-env-test-"));
}

describe("env command", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig();
    config.environments = ["production"];
    writeConfig(tmpDir, config);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("throws if no config exists", async () => {
    const emptyDir = makeTempDir();
    try {
      await expect(env(emptyDir, "production")).rejects.toThrow(
        "No envault project found"
      );
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it("throws if environment does not exist", async () => {
    await expect(env(tmpDir, "staging")).rejects.toThrow(
      "Environment 'staging' not found"
    );
  });

  it("throws if encrypted file is missing", async () => {
    const keys: Record<string, string> = { production: generatePassphrase() };
    writeKeys(tmpDir, keys);
    await expect(env(tmpDir, "production")).rejects.toThrow(
      "No encrypted file found"
    );
  });

  it("throws if key is missing", async () => {
    writeKeys(tmpDir, {});
    const encPath = getEncryptedPath(tmpDir, "production");
    fs.mkdirSync(path.dirname(encPath), { recursive: true });
    fs.writeFileSync(encPath, "dummy");
    await expect(env(tmpDir, "production")).rejects.toThrow(
      "No key found for environment"
    );
  });

  it("decrypts and returns variables", async () => {
    const passphrase = generatePassphrase();
    writeKeys(tmpDir, { production: passphrase });
    const content = 'DB_HOST=localhost\nDB_PORT=5432\nSECRET="my secret"';
    await encryptEnvFile(tmpDir, "production", content, passphrase);
    const result = await env(tmpDir, "production");
    expect(result.environment).toBe("production");
    expect(result.variables["DB_HOST"]).toBe("localhost");
    expect(result.variables["DB_PORT"]).toBe("5432");
    expect(result.variables["SECRET"]).toBe("my secret");
  });
});

describe("formatEnvOutput", () => {
  const vars = { FOO: "bar", BAZ: "qux value" };

  it("formats as dotenv", () => {
    const out = formatEnvOutput(vars, "dotenv");
    expect(out).toContain('FOO="bar"');
    expect(out).toContain('BAZ="qux value"');
    expect(out).not.toContain("export");
  });

  it("formats as export", () => {
    const out = formatEnvOutput(vars, "export");
    expect(out).toContain('export FOO="bar"');
  });

  it("formats as json", () => {
    const out = formatEnvOutput(vars, "json");
    const parsed = JSON.parse(out);
    expect(parsed.FOO).toBe("bar");
  });
});
