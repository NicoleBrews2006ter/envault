import { Command } from 'commander';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { registerVerifyCommand } from './verify-command';
import { createDefaultConfig, writeConfig } from '../config/project';

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerVerifyCommand(program);
  return program;
}

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-verify-cli-'));
}

describe('verify-command CLI', () => {
  let tmpDir: string;
  let consoleSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    tmpDir = makeTempDir();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should exit with error when config missing', async () => {
    const program = makeProgram();
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    await expect(
      program.parseAsync(['node', 'envault', 'verify', '--dir', tmpDir])
    ).rejects.toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('should run and show header output', async () => {
    const config = createDefaultConfig('my-project');
    config.environments = ['staging'];
    writeConfig(tmpDir, config);
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    await expect(
      program.parseAsync(['node', 'envault', 'verify', '--dir', tmpDir])
    ).rejects.toThrow();
    exitSpy.mockRestore();
    const program2 = makeProgram();
    const exitSpy2 = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    await expect(
      program2.parseAsync(['node', 'envault', 'verify', '--dir', tmpDir])
    ).rejects.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('envault verify'));
    exitSpy2.mockRestore();
  });

  it('should register the verify command', () => {
    const program = makeProgram();
    const cmd = program.commands.find(c => c.name() === 'verify');
    expect(cmd).toBeDefined();
    expect(cmd?.description()).toBe('Verify that encrypted env files are intact and decryptable');
  });
});
