import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { restore } from "./restore";
import { createDefaultConfig, writeConfig } from "../config/project";
import { writeKeys } from "../crypto/keyfile";
import { encryptEnvFile, getEncryptedPath } from "../crypto/envfile";
import { getSnapshotPath, getSnapshotDir } from "./snapshot";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-restore-"));
}

describe("restore", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  async function setupSnapshot(env: string, snapshotName: string, contents: string) {
    const config = createDefaultConfig();
    config.environments = [env];
    await writeConfig(tmpDir, config);
    await writeKeys(tmpDir, { [env]: "test-passphrase-32-bytes-long!!" });

    const snapshotDir = getSnapshotDir(tmpDir, env);
    fs.mkdirSync(snapshotDir, { recursive: true });

    const snapshotPath = getSnapshotPath(tmpDir, env, snapshotName);
    const envFilePath = path.join(tmpDir, `.env.${env}.tmp`);
    fs.writeFileSync(envFilePath, contents, "utf8");
    await encryptEnvFile(envFilePath, snapshotPath, "test-passphrase-32-bytes-long!!");
    fs.unlinkSync(envFilePath);
  }

  it("restores a snapshot to the default output path", async () => {
    await setupSnapshot("production", "snap1", "KEY=value\nFOO=bar\n");
    const result = await restore(tmpDir, { environment: "production", snapshot: "snap1", force: true });
    expect(result.restored).toBe(true);
    expect(fs.existsSync(result.outputPath)).toBe(true);
    const contents = fs.readFileSync(result.outputPath, "utf8");
    expect(contents).toContain("KEY=value");
  });

  it("restores to a custom output path", async () => {
    await setupSnapshot("staging", "snap2", "DB=postgres\n");
    const out = path.join(tmpDir, "custom.env");
    const result = await restore(tmpDir, { environment: "staging", snapshot: "snap2", output: out });
    expect(result.outputPath).toBe(out);
    expect(fs.existsSync(out)).toBe(true);
  });

  it("throws if environment does not exist", async () => {
    const config = createDefaultConfig();
    await writeConfig(tmpDir, config);
    await expect(restore(tmpDir, { environment: "ghost", snapshot: "snap1" })).rejects.toThrow(
      'Environment "ghost" does not exist'
    );
  });

  it("throws if snapshot does not exist", async () => {
    const config = createDefaultConfig();
    config.environments = ["dev"];
    await writeConfig(tmpDir, config);
    await writeKeys(tmpDir, { dev: "test-passphrase-32-bytes-long!!" });
    await expect(restore(tmpDir, { environment: "dev", snapshot: "missing" })).rejects.toThrow(
      'Snapshot "missing" not found'
    );
  });

  it("throws if output file exists and force is not set", async () => {
    await setupSnapshot("dev", "snap3", "X=1\n");
    const out = path.join(tmpDir, ".env.dev");
    fs.writeFileSync(out, "existing");
    await expect(restore(tmpDir, { environment: "dev", snapshot: "snap3", output: out })).rejects.toThrow(
      "already exists"
    );
  });
});
