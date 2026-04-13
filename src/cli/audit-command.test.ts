import { Command } from "commander";
import { registerAuditCommand } from "./audit-command";
import * as auditModule from "../commands/audit";

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerAuditCommand(program);
  return program;
}

describe("registerAuditCommand", () => {
  let runAuditSpy: jest.SpyInstance;

  beforeEach(() => {
    runAuditSpy = jest.spyOn(auditModule, "runAudit");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("registers the audit command", () => {
    const program = makeProgram();
    const cmd = program.commands.find((c) => c.name() === "audit");
    expect(cmd).toBeDefined();
  });

  it("calls runAudit with environment argument", async () => {
    runAuditSpy.mockResolvedValue([{ environment: "production", issues: [], checkedAt: Date.now() }]);
    const program = makeProgram();
    await program.parseAsync(["node", "test", "audit", "production"]);
    expect(runAuditSpy).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "production" })
    );
  });

  it("calls runAudit with --all flag", async () => {
    runAuditSpy.mockResolvedValue([]);
    const program = makeProgram();
    await program.parseAsync(["node", "test", "audit", "--all"]);
    expect(runAuditSpy).toHaveBeenCalledWith(
      expect.objectContaining({ all: true })
    );
  });

  it("outputs JSON when --json flag is set", async () => {
    const mockResults = [{ environment: "staging", issues: [], checkedAt: 1234567890 }];
    runAuditSpy.mockResolvedValue(mockResults);
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const program = makeProgram();
    await program.parseAsync(["node", "test", "audit", "staging", "--json"]);
    expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockResults, null, 2));
  });

  it("exits with code 1 when runAudit throws", async () => {
    runAuditSpy.mockRejectedValue(new Error("audit failed"));
    const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
    const program = makeProgram();
    await expect(
      program.parseAsync(["node", "test", "audit", "production"])
    ).rejects.toThrow("exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
