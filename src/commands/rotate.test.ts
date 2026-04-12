import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { rotateKey } from "./rotate";
import { createDefaultConfig } from "../config/project";
import { storeKey, readKeys } from "../crypto/keyfile";
import { deriveKey } from "../crypto/encryption";
import { encryptEnvFile, decryptEnvFile, getEncryptedPath } from "../crypto/envfile";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-rotate-test-"));
}

describe("rotateKey", () => {
  let tmpDir: string;
  let origHome: string | undefined;
  let envaultHome: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
    envaultHome = makeTempDir();
    origHome = process.env.HOME;
    process.env.HOME = envaultHome;
  });

  afterEach(() => {
    process.env.HOME = origHome;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.rmSync(envaultHome, { recursive: true, force: true });
  });

  it("throws if no config exists", async () => {
    await expect(rotateKey({ projectDir: tmpDir })).rejects.toThrow(
      "No envault config found"
    );
  });

  it("throws if no key found for environment", async () => {
    createDefaultConfig(tmpDir, "test-project");
    await expect(rotateKey({ projectDir: tmpDir, environment: "default" })).rejects.toThrow(
      'No key found for environment "default"'
    );
  });

  it("rotates the key and returns a new passphrase", async () => {
    createDefaultConfig(tmpDir, "rotate-proj");
    storeKey("rotate-proj", "default", undefined);

    const keys = readKeys();
    const oldEntry = keys["rotate-proj"]["default"];
    expect(oldEntry).toBeDefined();

    const result = await rotateKey({ projectDir: tmpDir, environment: "default" });

    expect(result.environment).toBe("default");
    expect(result.newPassphrase).toBeTruthy();
    expect(result.newPassphrase).not.toBe(oldEntry.passphrase);
  });

  it("re-encrypts existing encrypted file with new key", async () => {
    createDefaultConfig(tmpDir, "rotate-enc-proj");
    storeKey("rotate-enc-proj", "default", undefined);

    const keys = readKeys();
    const entry = keys["rotate-enc-proj"]["default"];
    const oldKey = await deriveKey(entry.passphrase, entry.salt);
    const encryptedPath = getEncryptedPath(tmpDir, "default");
    const originalContent = "DB_HOST=localhost\nDB_PORT=5432\n";
    await encryptEnvFile(originalContent, encryptedPath, oldKey);

    const result = await rotateKey({ projectDir: tmpDir, environment: "default" });

    const updatedKeys = readKeys();
    const newEntry = updatedKeys["rotate-enc-proj"]["default"];
    const newKey = await deriveKey(newEntry.passphrase, newEntry.salt);
    const decrypted = await decryptEnvFile(encryptedPath, newKey);

    expect(decrypted).toBe(originalContent);
    expect(result.newPassphrase).toBe(newEntry.passphrase);
  });
});
