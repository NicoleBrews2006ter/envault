import { Command } from "commander";
import { registerValidateCommand } from "./validate-command";
import * as validateModule from "../commands/validate";

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerValidateCommand(program);
  return program;
}

describe("registerValidateCommand", () => {
  let mockValidate: jest.SpyInstance;

  beforeEach(() => {
    mockValidate = jest
      .spyOn(validateModule, "validateCommand")
      .mockResolvedValue([
        { environment: "development", valid: true, errors: [], keyCount: 5 },
      ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("registers the validate command", () => {
    const program = makeProgram();
    const cmd = program.commands.find((c) => c.name() === "validate");
    expect(cmd).toBeDefined();
  });

  it("calls validateCommand with the given environment", async () => {
    const program = makeProgram();
    await program.parseAsync(["node", "test", "validate", "development"]);
    expect(mockValidate).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "development", all: false })
    );
  });

  it("passes required keys when --required flag is used", async () => {
    const program = makeProgram();
    await program.parseAsync([
      "node",
      "test",
      "validate",
      "development",
      "--required",
      "API_KEY,DB_URL",
    ]);
    expect(mockValidate).toHaveBeenCalledWith(
      expect.objectContaining({ requiredKeys: ["API_KEY", "DB_URL"] })
    );
  });

  it("passes all=true when --all flag is used", async () => {
    const program = makeProgram();
    await program.parseAsync(["node", "test", "validate", "--all"]);
    expect(mockValidate).toHaveBeenCalledWith(
      expect.objectContaining({ all: true, environment: undefined })
    );
  });

  it("exits with code 1 when validation fails", async () => {
    mockValidate.mockResolvedValue([
      {
        environment: "production",
        valid: false,
        errors: ["Missing required key: API_KEY"],
      },
    ]);
    const mockExit = jest
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    const program = makeProgram();
    await program.parseAsync(["node", "test", "validate", "production"]);
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });
});
