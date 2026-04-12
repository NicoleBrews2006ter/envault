import { describe, it, expect, vi, beforeEach } from 'vitest';
import yargs from 'yargs';
import { registerExportCommand } from './export-command';
import * as exportModule from '../commands/export';

describe('registerExportCommand', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('registers the export command', () => {
    const parser = registerExportCommand(yargs());
    const commands = (parser as any).getInternalMethods().getCommandInstance();
    expect(commands).toBeDefined();
  });

  it('calls exportEnv with correct arguments and logs output path', async () => {
    const spy = vi
      .spyOn(exportModule, 'exportEnv')
      .mockResolvedValue('/tmp/exported.env');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const parser = registerExportCommand(yargs()).help(false);
    await parser.parseAsync(['export', 'production']);

    expect(spy).toHaveBeenCalledWith({
      environment: 'production',
      output: undefined,
    });
    expect(consoleSpy).toHaveBeenCalledWith('✅ Exported to: /tmp/exported.env');
  });

  it('calls exportEnv with custom output path', async () => {
    const spy = vi
      .spyOn(exportModule, 'exportEnv')
      .mockResolvedValue('/custom/path.env');
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const parser = registerExportCommand(yargs()).help(false);
    await parser.parseAsync(['export', 'staging', '--output', '/custom/path.env']);

    expect(spy).toHaveBeenCalledWith({
      environment: 'staging',
      output: '/custom/path.env',
    });
  });

  it('logs error and exits on failure', async () => {
    vi.spyOn(exportModule, 'exportEnv').mockRejectedValue(
      new Error('No key found')
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });

    const parser = registerExportCommand(yargs()).help(false);
    await expect(parser.parseAsync(['export', 'development'])).rejects.toThrow(
      'process.exit'
    );

    expect(errorSpy).toHaveBeenCalledWith('❌ Export failed: No key found');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
