import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import { Command } from 'commander';
import { registerSnapshotCommand } from './snapshot-command';
import * as snapshotModule from '../commands/snapshot';

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerSnapshotCommand(program);
  return program;
}

describe('snapshot-command CLI', () => {
  it('registers snapshot create subcommand', () => {
    const program = makeProgram();
    const sub = program.commands.find(c => c.name() === 'snapshot');
    expect(sub).toBeDefined();
    const create = sub!.commands.find(c => c.name() === 'create');
    expect(create).toBeDefined();
  });

  it('registers snapshot list subcommand', () => {
    const program = makeProgram();
    const sub = program.commands.find(c => c.name() === 'snapshot');
    const list = sub!.commands.find(c => c.name() === 'list');
    expect(list).toBeDefined();
  });

  it('registers snapshot restore subcommand', () => {
    const program = makeProgram();
    const sub = program.commands.find(c => c.name() === 'snapshot');
    const restore = sub!.commands.find(c => c.name() === 'restore');
    expect(restore).toBeDefined();
  });

  it('calls createSnapshot on create action', async () => {
    const spy = spyOn(snapshotModule, 'createSnapshot').mockResolvedValue({
      environment: 'production',
      timestamp: '2024-01-01T00-00-00-000Z',
      contents: '',
    });
    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'snapshot', 'create', 'production'], { from: 'user' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('calls listSnapshots on list action', async () => {
    const spy = spyOn(snapshotModule, 'listSnapshots').mockResolvedValue([]);
    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'snapshot', 'list'], { from: 'user' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('calls restoreSnapshot on restore action', async () => {
    const spy = spyOn(snapshotModule, 'restoreSnapshot').mockResolvedValue(undefined);
    const program = makeProgram();
    await program.parseAsync(['node', 'envault', 'snapshot', 'restore', 'production', '2024-01-01T00-00-00-000Z'], { from: 'user' });
    expect(spy).toHaveBeenCalledWith(expect.any(String), 'production', '2024-01-01T00-00-00-000Z');
    spy.mockRestore();
  });
});
