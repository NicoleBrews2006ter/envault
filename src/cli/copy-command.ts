import { Command } from 'commander';
import { copyEnvironment } from '../commands/copy';

export function registerCopyCommand(program: Command): void {
  program
    .command('copy <source> <target>')
    .description('Copy an existing environment to a new environment name')
    .option('-d, --dir <path>', 'Project directory (defaults to current directory)')
    .action(async (source: string, target: string, opts: { dir?: string }) => {
      try {
        const projectDir = opts.dir ?? process.cwd();
        await copyEnvironment(source, target, { projectDir });
        console.log(`✔ Environment "${source}" copied to "${target}" successfully.`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`✖ Error: ${message}`);
        process.exit(1);
      }
    });
}
