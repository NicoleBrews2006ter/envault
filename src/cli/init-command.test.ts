import { Command } from 'commander';
import { registerInitCommand } from './init-command';

describe('registerInitCommand', () => {
  it('should register the init command on the program', () => {
    const program = new Command();
    registerInitCommand(program);

    const initCmd = program.commands.find((c) => c.name() === 'init');
    expect(initCmd).toBeDefined();
  });

  it('should have the correct description', () => {
    const program = new Command();
    registerInitCommand(program);

    const initCmd = program.commands.find((c) => c.name() === 'init');
    expect(initCmd?.description()).toMatch(/initialize/i);
  });

  it('should define --name option', () => {
    const program = new Command();
    registerInitCommand(program);

    const initCmd = program.commands.find((c) => c.name() === 'init');
    const nameOpt = initCmd?.options.find((o) => o.long === '--name');
    expect(nameOpt).toBeDefined();
  });

  it('should define --force option with default false', () => {
    const program = new Command();
    registerInitCommand(program);

    const initCmd = program.commands.find((c) => c.name() === 'init');
    const forceOpt = initCmd?.options.find((o) => o.long === '--force');
    expect(forceOpt).toBeDefined();
    expect(forceOpt?.defaultValue).toBe(false);
  });

  it('should define --env-file option with default .env', () => {
    const program = new Command();
    registerInitCommand(program);

    const initCmd = program.commands.find((c) => c.name() === 'init');
    const envFileOpt = initCmd?.options.find((o) => o.long === '--env-file');
    expect(envFileOpt).toBeDefined();
    expect(envFileOpt?.defaultValue).toBe('.env');
  });
});
