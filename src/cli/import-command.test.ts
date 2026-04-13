import { Command } from 'commander';
import { registerImportCommand } from './import-command';
import * as importModule from '../commands/import';

jest.mock('../commands/import');

const mockedImportEnv = importModule.importEnv as jest.MockedFunction<typeof importModule.importEnv>;

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerImportCommand(program);
  return program;
}

describe('registerImportCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers the import command on the program', () => {
    const program = makeProgram();
    const cmd = program.commands.find((c) => c.name() === 'import');
    expect(cmd).toBeDefined();
  });

  it('calls importEnv with correct arguments and logs success', async () => {
    mockedImportEnv.mockResolvedValueOnce({
      skipped: false,
      encryptedPath: '/project/.envault/default.enc',
      keyGenerated: false,
    });

    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'import', 'shared.enc', '--env', 'staging']);

    expect(mockedImportEnv).toHaveBeenCalledWith(
      expect.objectContaining({ environment: 'staging', force: false })
    );
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Successfully imported environment 'staging'"));
  });

  it('logs skipped message when environment exists and force is false', async () => {
    mockedImportEnv.mockResolvedValueOnce({
      skipped: true,
      encryptedPath: '',
      keyGenerated: false,
    });

    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'import', 'shared.enc']);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Import skipped'));
  });

  it('logs error and exits on failure', async () => {
    mockedImportEnv.mockRejectedValueOnce(new Error('file not found'));
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });

    const program = makeProgram();
    await expect(
      program.parseAsync(['node', 'envault', 'import', 'missing.enc'])
    ).rejects.toThrow('process.exit');

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('file not found'));
    mockExit.mockRestore();
  });
});
