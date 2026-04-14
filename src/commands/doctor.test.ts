import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { doctor } from "./doctor";
import { writeConfig } from "../config/project";
import { writeKeys } from "../crypto/keyfile";
import { getEncryptedPath } from "../crypto/envfile";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-doctor-"));
}

describe("doctor", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("fails fast when config does not exist", async () => {
    const result = await doctor(tmpDir);
    expect(result.allPassed).toBe(false);
    const configCheck = result.checks.find((c) => c.name === "Config file");
    expect(configCheck?.passed).toBe(false);
  });

  it("passes config check when .envault.json exists", async () => {
    await writeConfig(tmpDir, { projectId: "proj-1", environments: [] });
    const result = await doctor(tmpDir);
    const configCheck = result.checks.find((c) => c.name === "Config file");
    expect(configCheck?.passed).toBe(true);
  });

  it("reports no environments when list is empty", async () => {
    await writeConfig(tmpDir, { projectId: "proj-1", environments: [] });
    const result = await doctor(tmpDir);
    const envsCheck = result.checks.find(
      (c) => c.name === "Environments defined"
    );
    expect(envsCheck?.passed).toBe(false);
  });

  it("reports missing key for environment without stored key", async () => {
    await writeConfig(tmpDir, {
      projectId: "proj-1",
      environments: ["production"],
    });
    await writeKeys({});
    const result = await doctor(tmpDir);
    const keyCheck = result.checks.find(
      (c) => c.name === 'Key for "production"'
    );
    expect(keyCheck?.passed).toBe(false);
  });

  it("passes key check when key is stored", async () => {
    await writeConfig(tmpDir, {
      projectId: "proj-1",
      environments: ["staging"],
    });
    await writeKeys({ "proj-1:staging": "somepassphrase" });
    const result = await doctor(tmpDir);
    const keyCheck = result.checks.find(
      (c) => c.name === 'Key for "staging"'
    );
    expect(keyCheck?.passed).toBe(true);
  });

  it("reports missing encrypted file for environment", async () => {
    await writeConfig(tmpDir, {
      projectId: "proj-1",
      environments: ["dev"],
    });
    await writeKeys({ "proj-1:dev": "somepassphrase" });
    const result = await doctor(tmpDir);
    const fileCheck = result.checks.find(
      (c) => c.name === 'Encrypted file for "dev"'
    );
    expect(fileCheck?.passed).toBe(false);
  });

  it("passes encrypted file check when file exists", async () => {
    await writeConfig(tmpDir, {
      projectId: "proj-1",
      environments: ["dev"],
    });
    await writeKeys({ "proj-1:dev": "somepassphrase" });
    const encPath = getEncryptedPath(tmpDir, "dev");
    fs.writeFileSync(encPath, "encrypted-content");
    const result = await doctor(tmpDir);
    const fileCheck = result.checks.find(
      (c) => c.name === 'Encrypted file for "dev"'
    );
    expect(fileCheck?.passed).toBe(true);
  });
});
