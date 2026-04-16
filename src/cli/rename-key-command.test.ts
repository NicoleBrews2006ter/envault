import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Command } from 'commander';
import { registerRenameKeyCommand } from './rename-key-command';

function makeProgram() {
  const program = new Command();
  program.exitOverride();
  registerRenameKeyCommand(program);
  return program;
}

describe('registerRenameKeyCommand', () => {
  it('registers the rename-key command', () => {
    const program = makeProgram();
    const cmd = program.commands.find((c) => c.name() === 'rename-key');
    expect(cmd).toBeDefined();
  });

  it('rename-key command has correct arguments', () => {
    const program = makeProgram();
    const cmd = program.commands.find((c) => c.name() === 'rename-key');
    expect(cmd).toBeDefined();
    const usage = cmd!.usage();
    expect(usage).toContain('<environment>');
  });

  it('shows help without error', () => {
    const program = makeProgram();
    expect(() => program.parse(['rename-key', '--help'], { from: 'user' })).toThrow();
  });
});
