import { Command } from 'commander';
import { tail } from '../commands/tail';

export function registerTailCommand(program: Command): void {
  program
    .command('tail <environment>')
    .description('Show the last N lines of a decrypted environment file')
    .option('-n, --lines <number>', 'Number of lines to show', '10')
    .option('--raw', 'Show raw values (unmasked)', false)
    .action(async (environment: string, opts) => {
      try {
        const lines = await tail(environment, process.cwd(), {
          lines: parseInt(opts.lines, 10),
          raw: opts.raw,
        });
        if (lines.length === 0) {
          console.log(`No lines found in environment "${environment}".`);
        } else {
          lines.forEach(line => console.log(line));
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
