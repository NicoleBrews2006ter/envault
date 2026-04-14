import { Command } from "commander";
import { registerPruneCommand } from "./prune-command";
import * as pruneModule from "../commands/prune";

function makeProgram() {
  const program = new Command();
  program.exitOverride();
  registerPruneCommand(program);
  return program;
}

describe("prune-command", () => {
  let pruneSpy: jest.SpyInstance;

  beforeEach(() => {
    pruneSpy = jest.spyOn(pruneModule, "prune");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("calls prune with default options", async () => {
    pruneSpy.mockResolvedValue({ removed: [] });
    const program = makeProgram();
    await program.parseAsync(["node", "test", "prune"]);
    expect(pruneSpy).toHaveBeenCalledWith({
      environment: undefined,
      dryRun: false,
      force: false,
    });
  });

  it("passes --env option to prune", async () => {
    pruneSpy.mockResolvedValue({ removed: [] });
    const program = makeProgram();
    await program.parseAsync(["node", "test", "prune", "--env", "staging"]);
    expect(pruneSpy).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "staging" })
    );
  });

  it("passes --dry-run flag to prune", async () => {
    pruneSpy.mockResolvedValue({ removed: ["staging/.env.enc"] });
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const program = makeProgram();
    await program.parseAsync(["node", "test", "prune", "--dry-run"]);
    expect(pruneSpy).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true })
    );
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Would remove"));
  });

  it("logs removed files when prune succeeds", async () => {
    pruneSpy.mockResolvedValue({ removed: ["production/.env.enc", "test/.env.enc"] });
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const program = makeProgram();
    await program.parseAsync(["node", "test", "prune", "--force"]);
    expect(consoleSpy).toHaveBeenCalledWith("Removed 2 orphaned file(s):");
  });

  it("logs message when no orphaned files found", async () => {
    pruneSpy.mockResolvedValue({ removed: [] });
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const program = makeProgram();
    await program.parseAsync(["node", "test", "prune"]);
    expect(consoleSpy).toHaveBeenCalledWith("No orphaned files found.");
  });

  it("exits with code 1 on error", async () => {
    pruneSpy.mockRejectedValue(new Error("config not found"));
    const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit"); });
    jest.spyOn(console, "error").mockImplementation(() => {});
    const program = makeProgram();
    await expect(program.parseAsync(["node", "test", "prune"])).rejects.toThrow("exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
