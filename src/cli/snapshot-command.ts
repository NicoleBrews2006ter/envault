import { Command } from 'commander';
import { createSnapshot, listSnapshots, restoreSnapshot } from '../commands/snapshot';

export function registerSnapshotCommand(program: Command): void {
  const snapshot = program
    .command('snapshot')
    .description('Manage environment snapshots');

  snapshot
    .command('create <environment>')
    .description('Create a snapshot of an encrypted environment')
    .option('-l, --label <label>', 'Optional label for the snapshot')
    .action(async (environment: string, options: { label?: string }) => {
      try {
        const projectDir = process.cwd();
        const snap = await createSnapshot(projectDir, environment, options.label);
        console.log(`Snapshot created: ${snap.environment} @ ${snap.timestamp}`);
        if (snap.label) console.log(`Label: ${snap.label}`);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  snapshot
    .command('list')
    .description('List all snapshots')
    .option('-e, --environment <environment>', 'Filter by environment')
    .action(async (options: { environment?: string }) => {
      try {
        const projectDir = process.cwd();
        const snaps = await listSnapshots(projectDir, options.environment);
        if (snaps.length === 0) {
          console.log('No snapshots found.');
          return;
        }
        console.log('ENVIRONMENT       TIMESTAMP                        LABEL');
        console.log('─'.repeat(70));
        for (const s of snaps) {
          const label = s.label ?? '';
          console.log(`${s.environment.padEnd(18)}${s.timestamp.padEnd(33)}${label}`);
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  snapshot
    .command('restore <environment> <timestamp>')
    .description('Restore a snapshot for an environment')
    .action(async (environment: string, timestamp: string) => {
      try {
        const projectDir = process.cwd();
        await restoreSnapshot(projectDir, environment, timestamp);
        console.log(`Restored snapshot: ${environment} @ ${timestamp}`);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
