import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, beforeEach } from "bun:test";
import { compare } from "./compare";
import { writeConfig } from "../config/project";
import { encryptEnvFile, getEncryptedPath } from "../crypto/envfile";
import { writeKeys } from "../crypto/keyfile";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-compare-"));
}

describe("compare", () => {
  let projectDir: string;
  const projectName = "envault-compare-test";

  beforeEach(async () => {
    projectDir = makeTempDir();
    Object.defineProperty(path, "basename", { value: () => projectName, configurable: true });

    writeConfig(projectDir, {
      name: projectName,
      environments: { production: {}, staging: {} },
    });

    writeKeys({
      [`${projectName}:production`]: "passphrase-prod",
      [`${projectName}:staging`]: "passphrase-stg",
    });

    await encryptEnvFile(
      "DB_HOST=prod.db\nDB_PORT=5432\nSECRET=abc",
      getEncryptedPath(projectDir, "production"),
      "passphrase-prod"
    );
    await encryptEnvFile(
      "DB_HOST=stg.db\nDB_PORT=5432\nDEBUG=true",
      getEncryptedPath(projectDir, "staging"),
      "passphrase-stg"
    );
  });

  it("identifies keys only in A", async () => {
    const result = await compare(projectDir, "production", "staging");
    expect(result.onlyInA).toContain("SECRET");
  });

  it("identifies keys only in B", async () => {
    const result = await compare(projectDir, "production", "staging");
    expect(result.onlyInB).toContain("DEBUG");
  });

  it("identifies different values", async () => {
    const result = await compare(projectDir, "production", "staging");
    expect(result.different).toContain("DB_HOST");
  });

  it("identifies same values", async () => {
    const result = await compare(projectDir, "production", "staging");
    expect(result.same).toContain("DB_PORT");
  });

  it("throws when environment not found", async () => {
    await expect(compare(projectDir, "production", "unknown")).rejects.toThrow(
      'Environment "unknown" not found'
    );
  });
});
