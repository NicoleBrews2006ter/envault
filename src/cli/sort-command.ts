import { Command } from 'commander';
import { sort, SortOrder } from '../commands/sort';

export function registerSortCommand(program: Command): void {
  program
    .command('sort <environment>')
    .description('Sort environment variables alphabetically in an encrypted .env file')
    .option('-o, --order <order>', 'Sort order: asc or desc', 'asc')
    .action(async (environment: string, options: { order: string }) => {
      const order = options.order as SortOrder;
      if (order !== 'asc' && order !== 'desc') {
        console.error(`Invalid sort order "${order}". Use "asc" or "desc".`);
        process.exit(1);
      }

      try {
        const result = await sort(environment, order);
        console.log(
          `Sorted ${result.sorted} variable${result.sorted !== 1 ? 's' : ''} in "${result.environment}" (${order}).`
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });
}
