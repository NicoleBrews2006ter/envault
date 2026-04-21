import { Command } from 'commander';
import { mask } from '../commands/mask';

export function registerMaskCommand(program: Command): void {
  program
    .command('mask <environment>')
    .description('Display a masked view of an environment file with values hidden')
    .option('-r, --reveal <chars>', 'Number of trailing characters to reveal', '0')
    .option('--dir <path>', 'Project directory', process.cwd())
    .action(async (environment: string, options: { reveal: string; dir: string }) => {
      try {
        const reveal = parseInt(options.reveal, 10);
        if (isNaN(reveal) || reveal < 0) {
          console.error('Error: --reveal must be a non-negative integer');
          process.exit(1);
        }

        const result = await mask(options.dir, environment, reveal);

        console.log(`# Environment: ${result.environment} (${result.maskedCount} variables masked)\n`);
        for (const line of result.lines) {
          console.log(line);
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
