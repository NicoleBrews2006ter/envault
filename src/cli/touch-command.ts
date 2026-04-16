import { Command } from 'commander';
import { touch } from '../commands/touch';

export function registerTouchCommand(program: Command): void {
  program
    .command('touch <environment>')
    .description('Create an empty encrypted env file for an environment, or update its timestamp')
    .option('-d, --dir <path>', 'Project directory', process.cwd())
    .action(async (environment: string, options: { dir: string }) => {
      try {
        const result = await touch(options.dir, environment);
        if (result.existed) {
          console.log(`Touched existing environment "${result.environment}" (${result.path})`);
        } else {
          console.log(`Created empty environment "${result.environment}" at ${result.path}`);
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
