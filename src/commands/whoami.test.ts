import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { whoami } from "./whoami";
import { writeConfig } from "../config/project";
import { writeKeys } from "../crypto/keyfile";

async function makeTempDir(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "envault-whoami-"));
}

describe("whoami", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeTempDir();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns username and envaultDir", async () => {
    const result = await whoami(tmpDir);
    expect(typeof result.username).toBe("string");
    expect(result.username.length).toBeGreaterThan(0);
    expect(result.envaultDir).toContain(".envault");
  });

  it("returns null projectName when no config exists", async () => {
    const result = await whoami(tmpDir);
    expect(result.projectName).toBeNull();
    expect(result.environments).toEqual([]);
  });

  it("returns project info when config exists", async () => {
    await writeConfig(tmpDir, { project: "my-app", environments: ["dev", "prod"] });
    const result = await whoami(tmpDir);
    expect(result.projectName).toBe("my-app");
    expect(result.environments).toEqual(["dev", "prod"]);
  });

  it("returns keyCount of 0 when no keys stored", async () => {
    const result = await whoami(tmpDir);
    expect(result.keyCount).toBe(0);
  });

  it("returns correct keyCount when keys exist", async () => {
    await writeKeys({ "my-app:dev": "passphrase1", "my-app:prod": "passphrase2" });
    const result = await whoami(tmpDir);
    expect(result.keyCount).toBeGreaterThanOrEqual(2);
  });
});
