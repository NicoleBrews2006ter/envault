import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Command } from 'commander';
import { registerTouchCommand } from './touch-command';
import { createDefaultConfig, writeConfig } from '../config/project';
import { writeKeys } from '../crypto/keyfile';

function makeProgram() {
  const program = new Command();
  program.exitOverride();
  registerTouchCommand(program);
  return program;
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-touch-cli-'));
}

describe('touch-command CLI', () => {
  let tmpDir: string;
  let projectId: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig('touch-cli-test');
    projectId = config.projectId;
    writeConfig(tmpDir, config);
    writeKeys({ [projectId]: 'passphrase-xyz' });
  });

  it('creates a new environment and prints created message', async () => {
    const logs: string[] = [];
    jest.spyOn(console, 'log').mockImplementation(msg => logs.push(msg));
    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'touch', 'qa', '--dir', tmpDir]);
    expect(logs.some(l => l.includes('Created empty environment'))).toBe(true);
    (console.log as jest.Mock).mockRestore();
  });

  it('touches an existing environment and prints touched message', async () => {
    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'touch', 'qa', '--dir', tmpDir]);
    const logs: string[] = [];
    jest.spyOn(console, 'log').mockImplementation(msg => logs.push(msg));
    await program.parseAsync(['node', 'envault', 'touch', 'qa', '--dir', tmpDir]);
    expect(logs.some(l => l.includes('Touched existing environment'))).toBe(true);
    (console.log as jest.Mock).mockRestore();
  });
});
