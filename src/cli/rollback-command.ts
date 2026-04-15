import { Command } from 'commander';
import { rollback } from '../commands/rollback';

export function registerRollbackCommand(program: Command): void {
  program
    .command('rollback <environment>')
    .description('Roll back an environment to its previous or a specific snapshot')
    .option('-s, --snapshot <id>', 'Snapshot ID to roll back to (defaults to previous snapshot)')
    .option('-d, --dir <path>', 'Project directory (defaults to current directory)')
    .action(async (environment: string, options: { snapshot?: string; dir?: string }) => {
      try {
        const result = await rollback(environment, {
          projectDir: options.dir,
          snapshotId: options.snapshot,
        });

        console.log(
          `✔ Rolled back "${result.environment}" to snapshot ${result.snapshotId}`
        );
        console.log(`  Restored at: ${result.restoredAt}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`✖ Rollback failed: ${message}`);
        process.exit(1);
      }
    });
}
