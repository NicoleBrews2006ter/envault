import { Command } from 'commander';
import { rotateKey } from '../commands/rotate';

export function registerRotateCommand(program: Command): void {
  program
    .command('rotate')
    .description('Rotate the encryption key for the current project')
    .option('-e, --env <environment>', 'environment to rotate key for', 'default')
    .option('--force', 'skip confirmation prompt', false)
    .action(async (options: { env: string; force: boolean }) => {
      try {
        const result = await rotateKey({
          environment: options.env,
          force: options.force,
        });

        if (result.success) {
          console.log(`✓ Key rotated successfully for environment: ${options.env}`);
          console.log(`  New passphrase stored in keyfile.`);
          if (result.backedUp) {
            console.log(`  Old encrypted file backed up to: ${result.backupPath}`);
          }
        } else {
          console.error(`✗ Key rotation failed: ${result.error}`);
          process.exit(1);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`✗ Unexpected error during key rotation: ${message}`);
        process.exit(1);
      }
    });
}
