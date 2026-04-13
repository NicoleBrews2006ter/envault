import { Command } from 'commander';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { registerHistoryCommand } from './history-command';
import { appendHistory } from '../commands/history';
import { createDefaultConfig, writeConfig } from '../config/project';

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerHistoryCommand(program);
  return program;
}

describe('history CLI command', () => {
  let tmpDir: string;
  let originalCwd: string;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envault-history-cli-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    const config = createDefaultConfig('test-project');
    writeConfig(tmpDir, config);
    fs.mkdirSync(path.join(tmpDir, '.envault'), { recursive: true });
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    consoleSpy.mockRestore();
  });

  it('shows no history message when empty', async () => {
    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'history']);
    expect(consoleSpy).toHaveBeenCalledWith('No history entries found.');
  });

  it('displays history entries', async () => {
    appendHistory(tmpDir, { action: 'lock', environment: 'production' });
    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'history']);
    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('production');
    expect(output).toContain('lock');
  });

  it('filters by environment flag', async () => {
    appendHistory(tmpDir, { action: 'lock', environment: 'production' });
    appendHistory(tmpDir, { action: 'lock', environment: 'staging' });
    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'history', '-e', 'staging']);
    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('staging');
    expect(output).not.toContain('production');
  });

  it('limits output with -n flag', async () => {
    for (let i = 0; i < 5; i++) {
      appendHistory(tmpDir, { action: 'lock', environment: 'production' });
    }
    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'history', '-n', '2']);
    const rows = consoleSpy.mock.calls.filter((c) => String(c[0]).includes('production'));
    expect(rows.length).toBe(2);
  });
});
