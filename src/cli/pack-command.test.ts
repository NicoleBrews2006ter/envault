import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { registerPackCommand } from './pack-command';
import { createDefaultConfig, writeConfig } from '../config/project';
import { getEncryptedPath } from '../crypto/envfile';

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerPackCommand(program);
  return program;
}

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-pack-cli-test-'));
}

describe('pack-command CLI', () => {
  let consoleSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('outputs bundle path on success', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig('testproject');
    config.environments['production'] = { createdAt: new Date().toISOString() };
    writeConfig(dir, config);
    fs.writeFileSync(
      getEncryptedPath(dir, 'production'),
      JSON.stringify({ iv: 'x', data: 'y' })
    );

    const outFile = path.join(dir, 'out.json');
    const program = makeProgram();
    await program.parseAsync(['pack', '--dir', dir, '--output', outFile], {
      from: 'user',
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Bundle created')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('production')
    );
  });

  it('prints error and exits on failure', async () => {
    const dir = makeTempDir();
    const program = makeProgram();

    await expect(
      program.parseAsync(['pack', '--dir', dir], { from: 'user' })
    ).rejects.toThrow('process.exit called');

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('No envault project found')
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
