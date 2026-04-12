import { listEnvironments } from "../commands/list";
import { registerListCommand } from "./list-command";

jest.mock("../commands/list");

const mockListEnvironments = listEnvironments as jest.MockedFunction<typeof listEnvironments>;

describe("registerListCommand", () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit"); });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("prints message when no environments configured", async () => {
    mockListEnvironments.mockResolvedValueOnce({ environments: [] });

    const yargs = { command: jest.fn().mockReturnThis() } as any;
    registerListCommand(yargs);
    const handler = yargs.command.mock.calls[0][3];
    await handler();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("No environments configured")
    );
  });

  it("prints environment list with status", async () => {
    mockListEnvironments.mockResolvedValueOnce({
      environments: [
        { name: "development", hasKey: true, isLocked: false, encryptedPath: "/tmp/dev.enc" },
        { name: "production", hasKey: false, isLocked: true, encryptedPath: "/tmp/prod.enc" },
      ],
    });

    const yargs = { command: jest.fn().mockReturnThis() } as any;
    registerListCommand(yargs);
    const handler = yargs.command.mock.calls[0][3];
    await handler();

    expect(consoleLogSpy).toHaveBeenCalledWith("Environments:");
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("development"));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("production"));
  });

  it("handles errors gracefully", async () => {
    mockListEnvironments.mockRejectedValueOnce(new Error("No envault config found"));

    const yargs = { command: jest.fn().mockReturnThis() } as any;
    registerListCommand(yargs);
    const handler = yargs.command.mock.calls[0][3];

    await expect(handler()).rejects.toThrow("process.exit");
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("No envault config found"));
  });
});
