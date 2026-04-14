import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { registerWatchCommand } from "./watch-command";

function makeProgram() {
  const program = new Command();
  program.exitOverride();
  registerWatchCommand(program);
  return program;
}

describe("registerWatchCommand", () => {
  beforeEach(() => {
    vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers the watch command", () => {
    const program = makeProgram();
    const cmd = program.commands.find((c) => c.name() === "watch");
    expect(cmd).toBeDefined();
  });

  it("calls process.exit(1) on error", async () => {
    const watchMock = vi.fn().mockRejectedValue(new Error("no config"));
    vi.doMock("../commands/watch", () => ({ watch: watchMock }));

    const { registerWatchCommand: reg } = await import("./watch-command");
    const program = new Command();
    program.exitOverride();
    reg(program);

    await program.parseAsync(["node", "envault", "watch", "development"]);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("logs watching message on success", async () => {
    const stopFn = vi.fn();
    const watchMock = vi.fn().mockResolvedValue({
      watching: true,
      filePath: "/tmp/project/.env.development",
      environment: "development",
      stop: stopFn,
    });
    vi.doMock("../commands/watch", () => ({ watch: watchMock }));

    const { registerWatchCommand: reg } = await import("./watch-command");
    const program = new Command();
    program.exitOverride();
    reg(program);

    await program.parseAsync(["node", "envault", "watch", "development"]);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Watching")
    );
  });
});
