import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { template } from "./template";
import { createDefaultConfig, writeConfig } from "../config/project";
import { writeKeys } from "../crypto/keyfile";
import { encryptEnvFile } from "../crypto/envfile";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-template-"));
}

describe("template", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig();
    config.environments = ["production"];
    await writeConfig(tmpDir, config);
    await writeKeys(tmpDir, { production: "test-passphrase-32-chars-long-abc" });
    const envContent = "DB_HOST=db.example.com\nDB_PORT=5432\nAPI_KEY=secret123\n";
    await encryptEnvFile(tmpDir, "production", envContent, "test-passphrase-32-chars-long-abc");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("substitutes known placeholders", async () => {
    const result = await template(tmpDir, "production", "Host: {{DB_HOST}}, Port: {{DB_PORT}}");
    expect(result.output).toBe("Host: db.example.com, Port: 5432");
    expect(result.missingKeys).toHaveLength(0);
  });

  it("tracks missing keys", async () => {
    const result = await template(tmpDir, "production", "Host: {{DB_HOST}}, Missing: {{UNKNOWN_KEY}}");
    expect(result.output).toContain("db.example.com");
    expect(result.output).toContain("{{UNKNOWN_KEY}}");
    expect(result.missingKeys).toContain("UNKNOWN_KEY");
  });

  it("writes output to file when outputPath is provided", async () => {
    const outFile = path.join(tmpDir, "rendered.conf");
    await template(tmpDir, "production", "api={{API_KEY}}", outFile);
    const written = fs.readFileSync(outFile, "utf-8");
    expect(written).toBe("api=secret123");
  });

  it("throws for unknown environment", async () => {
    await expect(template(tmpDir, "staging", "{{DB_HOST}}")).rejects.toThrow(
      'Environment "staging" not found'
    );
  });

  it("throws when no key is stored for environment", async () => {
    await writeKeys(tmpDir, {});
    await expect(template(tmpDir, "production", "{{DB_HOST}}")).rejects.toThrow(
      'No key found for environment "production"'
    );
  });
});
