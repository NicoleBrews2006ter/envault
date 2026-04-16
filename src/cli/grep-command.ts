import { Command } from 'commander';
import { grep } from '../commands/grep';

export function registerGrepCommand(program: Command): void {
  program
    .command('grep <pattern>')
    .description('Search for a pattern in env variable keys or values')
    .option('-e, --env <environment>', 'environment to search in', 'default')
    .option('-k, --keys-only', 'search keys only')
    .option('-v, --values-only', 'search values only')
    .option('-i, --ignore-case', 'case-insensitive search')
    .action(async (pattern: string, options) => {
      try {
        const results = await grep(process.cwd(), {
          pattern,
          environment: options.env,
          keysOnly: options.keysOnly ?? false,
          valuesOnly: options.valuesOnly ?? false,
          ignoreCase: options.ignoreCase ?? false,
        });

        if (results.length === 0) {
          console.log('No matches found.');
          return;
        }

        for (const result of results) {
          const keyPart = options.valuesOnly ? '' : `\x1b[36m${result.key}\x1b[0m`;
          const sep = options.keysOnly || options.valuesOnly ? '' : '=';
          const valPart = options.keysOnly ? '' : result.value;
          console.log(`${keyPart}${sep}${valPart}`);
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
