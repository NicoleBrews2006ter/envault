import { Command } from 'commander';
import { unset } from '../commands/unset';

export function registerUnsetCommand(program: Command): void {
  program
    .command('unset <key>')
    .description('Remove a variable from an environment')
    .option('-e, --env <environment>', 'target environment', 'development')
    .option('--no-backup', 'skip creating a backup before modifying')
    .action(async (key: string, options: { env: string; backup: boolean }) => {
      try {
        const result = await unset({
          key,
          environment: options.env,
          backup: options.backup,
        });

        if (!result.success) {
          console.error(`Error: ${result.error}`);
          process.exit(1);
        }

        console.log(
          `✓ Removed variable "${key}" from environment "${options.env}"`
        );

        if (result.backedUp) {
          console.log(`  Backup saved to ${result.backupPath}`);
        }
      } catch (err) {
        console.error(`Unexpected error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
