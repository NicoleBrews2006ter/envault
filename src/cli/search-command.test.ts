import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Command } from "commander";
import { registerSearchCommand } from "./search-command";
import { createDefaultConfig, writeConfig } from "../config/project";
import { storeKey, generatePassphrase } from "../crypto/keyfile";
import { encryptEnvFile } from "../crypto/envfile";

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerSearchCommand(program);
  return program;
}

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-search-cli-test-"));
}

describe("registerSearchCommand", () => {
  let tmpDir: string;
  let originalCwd: () => string;

  beforeEach(async () => {
    tmpDir = makeTempDir();
    originalCwd = process.cwd;
    process.cwd = () => tmpDir;

    const config = createDefaultConfig();
    writeConfig(tmpDir, config);

    const passphrase = generatePassphrase();
    storeKey(tmpDir, "development", passphrase);
    await encryptEnvFile(tmpDir, "development", "API_KEY=abc123\nDB_HOST=localhost\n", passphrase);
  });

  afterEach(() => {
    process.cwd = originalCwd;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("outputs matches when found", async () => {
    const program = makeProgram();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await program.parseAsync(["node", "envault", "search", "API"]);
    const output = consoleSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("API_KEY");
    consoleSpy.mockRestore();
  });

  it("outputs no-matches message when nothing found", async () => {
    const program = makeProgram();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await program.parseAsync(["node", "envault", "search", "NONEXISTENT_XYZ"]);
    const output = consoleSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("No matches found");
    consoleSpy.mockRestore();
  });

  it("exits with error when project not initialized", async () => {
    process.cwd = () => "/nonexistent";
    const program = makeProgram();
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await program.parseAsync(["node", "envault", "search", "KEY"]);
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
