import { Command } from 'commander';
import { fmt } from '../commands/fmt';

export function registerFmtCommand(program: Command): void {
  program
    .command('fmt')
    .description('Format an encrypted .env file (normalize whitespace and blank lines)')
    .option('-e, --env <env>', 'environment name')
    .option('--check', 'check if formatting is needed without writing changes')
    .action(async (opts) => {
      try {
        const result = await fmt(process.cwd(), {
          env: opts.env,
          check: opts.check,
        });

        if (opts.check) {
          if (result.formatted) {
            console.log(`Environment "${result.env}" needs formatting.`);
            process.exit(1);
          } else {
            console.log(`Environment "${result.env}" is already formatted.`);
          }
        } else {
          if (result.formatted) {
            console.log(`Formatted environment "${result.env}".`);
          } else {
            console.log(`Environment "${result.env}" was already formatted.`);
          }
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
