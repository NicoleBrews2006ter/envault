import { describe, it, expect, mock, beforeEach } from "bun:test";
import { Command } from "commander";
import { registerCompareCommand } from "./compare-command";

function makeProgram() {
  const program = new Command();
  program.exitOverride();
  registerCompareCommand(program);
  return program;
}

describe("registerCompareCommand", () => {
  let mockCompare: ReturnType<typeof mock>;

  beforeEach(() => {
    mockCompare = mock(() =>
      Promise.resolve({
        onlyInA: ["SECRET"],
        onlyInB: ["DEBUG"],
        different: ["DB_HOST"],
        same: ["DB_PORT"],
      })
    );
    mock.module("../commands/compare", () => ({ compare: mockCompare }));
  });

  it("registers the compare command", () => {
    const program = makeProgram();
    const cmd = program.commands.find((c) => c.name() === "compare");
    expect(cmd).toBeDefined();
  });

  it("compare command has correct description", () => {
    const program = makeProgram();
    const cmd = program.commands.find((c) => c.name() === "compare");
    expect(cmd?.description()).toContain("Compare two environments");
  });

  it("compare command accepts --only-diff flag", () => {
    const program = makeProgram();
    const cmd = program.commands.find((c) => c.name() === "compare");
    const opts = cmd?.options.map((o) => o.long);
    expect(opts).toContain("--only-diff");
  });

  it("compare command accepts --dir option", () => {
    const program = makeProgram();
    const cmd = program.commands.find((c) => c.name() === "compare");
    const opts = cmd?.options.map((o) => o.long);
    expect(opts).toContain("--dir");
  });
});
