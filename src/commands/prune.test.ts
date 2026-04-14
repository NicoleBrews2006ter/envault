import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prune } from "./prune";
import { writeConfig } from "../config/project";
import { writeKeys } from "../crypto/keyfile";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-prune-"));
}

describe("prune", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
    fs.mkdirSync(path.join(tmpDir, ".envault"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("removes keys and encrypted files for environments not in config", async () => {
    await writeConfig(tmpDir, { environments: [{ name: "production" }] });
    await writeKeys(tmpDir, {
      production: "key-prod",
      staging: "key-staging",
    });
    fs.writeFileSync(path.join(tmpDir, ".envault", "staging.enc"), "encrypted");

    const result = await prune(tmpDir);

    expect(result.removed).toContain("staging");
    expect(result.kept).toContain("production");
    expect(fs.existsSync(path.join(tmpDir, ".envault", "staging.enc"))).toBe(false);
  });

  it("dry run does not delete files or modify keys", async () => {
    await writeConfig(tmpDir, { environments: [{ name: "production" }] });
    await writeKeys(tmpDir, {
      production: "key-prod",
      staging: "key-staging",
    });
    const encPath = path.join(tmpDir, ".envault", "staging.enc");
    fs.writeFileSync(encPath, "encrypted");

    const result = await prune(tmpDir, true);

    expect(result.removed).toContain("staging");
    expect(fs.existsSync(encPath)).toBe(true);
  });

  it("returns empty removed list when all environments match config", async () => {
    await writeConfig(tmpDir, { environments: [{ name: "development" }] });
    await writeKeys(tmpDir, { development: "key-dev" });

    const result = await prune(tmpDir);

    expect(result.removed).toHaveLength(0);
    expect(result.kept).toContain("development");
  });

  it("removes orphaned encrypted files not tracked in keys", async () => {
    await writeConfig(tmpDir, { environments: [{ name: "production" }] });
    await writeKeys(tmpDir, { production: "key-prod" });
    const orphanPath = path.join(tmpDir, ".envault", "orphan.enc");
    fs.writeFileSync(orphanPath, "orphaned data");

    const result = await prune(tmpDir);

    expect(result.removed).toContain("orphan");
    expect(fs.existsSync(orphanPath)).toBe(false);
  });
});
