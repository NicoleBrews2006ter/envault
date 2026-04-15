import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Command } from "commander";
import { registerTemplateCommand } from "./template-command";
import * as templateModule from "../commands/template";

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerTemplateCommand(program);
  return program;
}

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "envault-template-cli-"));
}

describe("registerTemplateCommand", () => {
  let tmpDir: string;
  let templateFile: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
    templateFile = path.join(tmpDir, "app.conf.tmpl");
    fs.writeFileSync(templateFile, "host={{DB_HOST}}", "utf-8");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("calls template and prints output to stdout", async () => {
    const spy = vi.spyOn(templateModule, "template").mockResolvedValue({
      output: "host=db.example.com",
      missingKeys: [],
    });
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const program = makeProgram();
    await program.parseAsync(["node", "envault", "template", "production", templateFile, "-d", tmpDir]);

    expect(spy).toHaveBeenCalledWith(tmpDir, "production", "host={{DB_HOST}}", undefined);
    expect(writeSpy).toHaveBeenCalledWith("host=db.example.com");
  });

  it("warns about missing keys", async () => {
    vi.spyOn(templateModule, "template").mockResolvedValue({
      output: "host={{UNKNOWN}}",
      missingKeys: ["UNKNOWN"],
    });
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const program = makeProgram();
    await program.parseAsync(["node", "envault", "template", "production", templateFile, "-d", tmpDir]);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("UNKNOWN"));
  });

  it("exits with error when template file does not exist", async () => {
    const program = makeProgram();
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await program.parseAsync(["node", "envault", "template", "production", "/nonexistent.tmpl", "-d", tmpDir]);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("not found"));
  });
});
