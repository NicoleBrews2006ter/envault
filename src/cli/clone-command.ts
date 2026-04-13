import { Command } from 'commander';
import { cloneEnvironment } from '../commands/clone';

export function registerCloneCommand(program: Command): void {
  program
    .command('clone <source> <target>')
    .description('Clone an existing environment into a new one, copying its encrypted file and key')
    .option('-d, --dir <path>', 'Project directory (defaults to current working directory)')
    .action(async (source: string, target: string, opts: { dir?: string }) => {
      try {
        await cloneEnvironment({
          sourceEnv: source,
          targetEnv: target,
          projectDir: opts.dir,
        });
        console.log(`✔ Environment "${source}" cloned to "${target}" successfully.`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`✖ Clone failed: ${message}`);
        process.exit(1);
      }
    });
}
