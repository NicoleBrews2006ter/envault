import type { Command } from 'commander';
import { addEnvFile } from '../commands/add';

export function registerAddCommand(program: Command): void {
  program
    .command('add [envfile]')
    .description('Encrypt and track an .env file for the current project')
    .option('-d, --dir <path>', 'project directory (defaults to cwd)')
    .action(async (envfile: string | undefined, opts: { dir?: string }) => {
      try {
        await addEnvFile({
          env: envfile ?? '.env',
          projectDir: opts.dir,
        });
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
