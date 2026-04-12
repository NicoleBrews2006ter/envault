import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { listEnvironments } from "./list";
import { createDefaultConfig, writeConfig } from "../config/project";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-list-test-"));
}

describe("listEnvironments", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("throws if no config exists", async () => {
    await expect(listEnvironments(tmpDir)).rejects.toThrow(
      "No envault config found"
    );
  });

  it("returns empty environments list when config has none", async () => {
    const config = createDefaultConfig("test-project");
    config.environments = [];
    writeConfig(tmpDir, config);

    const result = await listEnvironments(tmpDir);
    expect(result.environments).toHaveLength(0);
  });

  it("lists environments from config", async () => {
    const config = createDefaultConfig("test-project");
    config.environments = ["development", "staging"];
    writeConfig(tmpDir, config);

    const result = await listEnvironments(tmpDir);
    expect(result.environments).toHaveLength(2);
    expect(result.environments[0].name).toBe("development");
    expect(result.environments[1].name).toBe("staging");
  });

  it("marks environment as locked when encrypted file exists but not plain", async () => {
    const config = createDefaultConfig("test-project");
    config.environments = ["production"];
    writeConfig(tmpDir, config);

    const encDir = path.join(tmpDir, ".envault");
    fs.mkdirSync(encDir, { recursive: true });
    fs.writeFileSync(path.join(encDir, "production.env.enc"), "encrypted");

    const result = await listEnvironments(tmpDir);
    expect(result.environments[0].isLocked).toBe(true);
  });

  it("marks environment as not locked when plain env file exists", async () => {
    const config = createDefaultConfig("test-project");
    config.environments = ["development"];
    writeConfig(tmpDir, config);

    fs.writeFileSync(path.join(tmpDir, ".env.development"), "KEY=value");

    const result = await listEnvironments(tmpDir);
    expect(result.environments[0].isLocked).toBe(false);
  });
});
