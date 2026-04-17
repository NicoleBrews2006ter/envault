import { Command } from 'commander';
import { registerStatsCommand } from './stats-command';
import * as statsModule from '../commands/stats';

function makeProgram() {
  const program = new Command();
  program.exitOverride();
  registerStatsCommand(program);
  return program;
}

describe('stats-command', () => {
  it('registers stats command', () => {
    const program = makeProgram();
    const cmd = program.commands.find((c) => c.name() === 'stats');
    expect(cmd).toBeDefined();
  });

  it('calls stats and prints table output', async () => {
    const program = makeProgram();
    const mockResult: statsModule.StatsResult = {
      project: 'demo',
      environments: [
        { environment: 'production', keyCount: 3, encryptedSize: 512, lastModified: new Date('2024-01-01') },
      ],
      totalKeys: 3,
      totalSize: 512,
    };
    jest.spyOn(statsModule, 'stats').mockResolvedValue(mockResult);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await program.parseAsync(['stats'], { from: 'user' });

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('demo'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('production'));
    spy.mockRestore();
  });

  it('outputs JSON when --json flag is passed', async () => {
    const program = makeProgram();
    const mockResult: statsModule.StatsResult = {
      project: 'demo',
      environments: [],
      totalKeys: 0,
      totalSize: 0,
    };
    jest.spyOn(statsModule, 'stats').mockResolvedValue(mockResult);
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await program.parseAsync(['stats', '--json'], { from: 'user' });

    const output = spy.mock.calls[0][0];
    expect(() => JSON.parse(output)).not.toThrow();
    spy.mockRestore();
  });
});
