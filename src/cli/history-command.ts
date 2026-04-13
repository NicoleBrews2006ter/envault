import { Command } from 'commander';
import { history } from '../commands/history';
import * as process from 'process';

function formatHistoryRow(entry: { timestamp: string; action: string; environment: string; user?: string }): string {
  const ts = new Date(entry.timestamp).toLocaleString();
  const user = entry.user ? ` (${entry.user})` : '';
  return `  ${ts}  [${entry.environment}]  ${entry.action}${user}`;
}

export function registerHistoryCommand(program: Command): void {
  program
    .command('history')
    .description('Show the action history for environments')
    .option('-e, --environment <env>', 'Filter by environment name')
    .option('-n, --limit <number>', 'Limit number of entries shown', parseInt)
    .action((options) => {
      const projectDir = process.cwd();
      try {
        const entries = history(projectDir, {
          environment: options.environment,
          limit: options.limit,
        });

        if (entries.length === 0) {
          console.log('No history entries found.');
          return;
        }

        console.log('\nEnvault History');
        console.log('================');
        entries.forEach((entry) => {
          console.log(formatHistoryRow(entry));
        });
        console.log();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });
}
