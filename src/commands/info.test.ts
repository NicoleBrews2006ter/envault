import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { infoCommand } from "./info";
import { writeConfig } from "../config/project";
import { writeKeys } from "../crypto/keyfile";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-info-test-"));
}

describe("infoCommand", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("throws if project is not initialized", async () => {
    await expect(infoCommand(tmpDir)).rejects.toThrow(
      "No envault project found"
    );
  });

  it("returns project info with no environments", async () => {
    writeConfig(tmpDir, { projectName: "my-project", environments: [] });

    const result = await infoCommand(tmpDir);

    expect(result.projectName).toBe("my-project");
    expect(result.environments).toHaveLength(0);
    expect(result.configPath).toContain(".envault.json");
  });

  it("returns environment info with hasEncryptedFile and hasKey flags", async () => {
    writeConfig(tmpDir, {
      projectName: "test-proj",
      environments: ["development", "production"],
    });

    writeKeys({ "test-proj:development": "somepassphrase" });

    const encryptedPath = path.join(tmpDir, ".env.development.enc");
    fs.writeFileSync(encryptedPath, "encrypted-content");

    const result = await infoCommand(tmpDir);

    expect(result.environments).toHaveLength(2);

    const devEnv = result.environments.find((e) => e.name === "development");
    expect(devEnv?.hasEncryptedFile).toBe(true);
    expect(devEnv?.hasKey).toBe(true);

    const prodEnv = result.environments.find((e) => e.name === "production");
    expect(prodEnv?.hasEncryptedFile).toBe(false);
    expect(prodEnv?.hasKey).toBe(false);

    writeKeys({});
  });
});
