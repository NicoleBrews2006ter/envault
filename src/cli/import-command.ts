import { Command } from 'commander';
import * as path from 'path';
import { importEnv } from '../commands/import';

export function registerImportCommand(program: Command): void {
  program
    .command('import <file>')
    .description('Import an encrypted .env file shared by a team member')
    .option('-e, --env <environment>', 'target environment name', 'default')
    .option('-f, --force', 'overwrite existing environment without prompting', false)
    .action(async (file: string, options: { env: string; force: boolean }) => {
      try {
        const resolvedFile = path.resolve(process.cwd(), file);
        const result = await importEnv({
          filePath: resolvedFile,
          environment: options.env,
          force: options.force,
          projectDir: process.cwd(),
        });

        if (result.skipped) {
          console.log(`Import skipped: environment '${options.env}' already exists. Use --force to overwrite.`);
          return;
        }

        console.log(`✓ Successfully imported environment '${options.env}' from ${file}`);
        console.log(`  Stored encrypted file at: ${result.encryptedPath}`);
        if (result.keyGenerated) {
          console.log(`  New decryption key generated and stored in keyfile.`);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error importing environment: ${message}`);
        process.exit(1);
      }
    });
}
