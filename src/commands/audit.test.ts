import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { auditProject } from "./audit";
import { writeConfig } from "../config/project";
import { writeKeys } from "../crypto/keyfile";
import { getEncryptedPath } from "../crypto/envfile";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-audit-test-"));
}

describe("auditProject", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true,;

  it("reports healthy environment when file and key exist", async () => {
    await writeConfig(tmpDir, { projectId: "test-proj", environments: ["production"] });
    await writeKeys("test-proj", { production: "somekey" });
    const encPath = getEncryptedPath(tmpDir, "production");
    fs.mkdirSync(path.dirname(encPath), { recursive: true });
    fs.writeFileSync(encPath, "encrypted-data");

    const report = await auditProject(tmpDir);

    expect(report.projectName).toBe("test-proj");
    expect(report.totalEnvironments).toBe(1);
    expect(report.healthyEnvironments).toBe(1);
    expect(report.missingKeys).toHaveLength(0);
    expect(report.missingFiles).toHaveLength(0);
    expect(report.environments[0].hasEncryptedFile).toBe(true);
    expect(report.environments[0].hasKey).toBe(true);
    expect(report.environments[0].lastModified).toBeInstanceOf(Date);
  });

  it("reports missing key for environment", async () => {
    await writeConfig(tmpDir, { projectId: "test-proj", environments: ["staging"] });
    await writeKeys("test-proj", {});
    const encPath = getEncryptedPath(tmpDir, "staging");
    fs.mkdirSync(path.dirname(encPath), { recursive: true });
    fs.writeFileSync(encPath, "encrypted-data");

    const report = await auditProject(tmpDir);

    expect(report.missingKeys).toContain("staging");
    expect(report.healthyEnvironments).toBe(0);
  });

  it("reports missing encrypted file for environment", async () => {
    await writeConfig(tmpDir, { projectId: "test-proj", environments: ["development"] });
    await writeKeys("test-proj", { development: "somekey" });

    const report = await auditProject(tmpDir);

    expect(report.missingFiles).toContain("development");
    expect(report.healthyEnvironments).toBe(0);
    expect(report.environments[0].lastModified).toBeNull();
  });

  it("handles multiple environments with mixed health", async () => {
    await writeConfig(tmpDir, {
      projectId: "multi-proj",
      environments: ["production", "staging", "development"],
    });
    await writeKeys("multi-proj", { production: "key1", staging: "key2" });
    const encPath = getEncryptedPath(tmpDir, "production");
    fs.mkdirSync(path.dirname(encPath), { recursive: true });
    fs.writeFileSync(encPath, "data");

    const report = await auditProject(tmpDir);

    expect(report.totalEnvironments).toBe(3);
    expect(report.healthyEnvironments).toBe(1);
    expect(report.missingKeys).toContain("development");
    expect(report.missingFiles).toContain("staging");
    expect(report.missingFiles).toContain("development");
  });
});
