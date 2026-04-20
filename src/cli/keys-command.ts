import { Command } from 'commander';
import { keys, KeyEntry } from '../commands/keys';

function formatKeyRow(entry: KeyEntry): string {
  const created = entry.createdAt !== 'unknown'
    ? new Date(entry.createdAt).toLocaleDateString()
    : 'unknown';
  return `  ${entry.environment.padEnd(20)} ${entry.fingerprint.padEnd(18)} ${entry.algorithm.padEnd(14)} ${created}`;
}

export function registerKeysCommand(program: Command): void {
  program
    .command('keys')
    .description('List all stored encryption keys for the current project')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const projectDir = process.cwd();
        const entries = await keys(projectDir);

        if (options.json) {
          console.log(JSON.stringify(entries, null, 2));
          return;
        }

        if (entries.length === 0) {
          console.log('No keys found for this project.');
          return;
        }

        const header = `  ${'ENVIRONMENT'.padEnd(20)} ${'FINGERPRINT'.padEnd(18)} ${'ALGORITHM'.padEnd(14)} CREATED`;
        const separator = '  ' + '-'.repeat(72);
        console.log(header);
        console.log(separator);
        for (const entry of entries) {
          console.log(formatKeyRow(entry));
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
