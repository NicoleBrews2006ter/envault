import { Command } from 'commander';
import { head } from '../commands/head';
import * as process from 'process';

export function registerHeadCommand(program: Command): void {
  program
    .command('head <environment>')
    .description('Show the first lines of an environment file')
    .option('-n, --lines <number>', 'Number of lines to show', '10')
    .option('-d, --decrypt', 'Decrypt the file before showing lines', false)
    .action(async (environment: string, options: { lines: string; decrypt: boolean }) => {
      try {
        const projectRoot = process.cwd();
        const lines = parseInt(options.lines, 10);

        if (isNaN(lines) || lines < 1) {
          console.error('Error: --lines must be a positive integer.');
          process.exit(1);
        }

        const result = await head(projectRoot, environment, {
          lines,
          decrypt: options.decrypt,
        });

        result.forEach((line) => console.log(line));
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
