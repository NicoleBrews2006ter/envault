import { Command } from 'commander';
import { stats } from '../commands/stats';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}

export function registerStatsCommand(program: Command): void {
  program
    .command('stats')
    .description('Show statistics for all environments in the project')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const result = await stats(process.cwd());

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log(`Project: ${result.project}`);
        console.log(`${'Environment'.padEnd(20)} ${'Keys'.padEnd(8)} ${'Size'.padEnd(10)} Last Modified`);
        console.log('-'.repeat(60));

        for (const env of result.environments) {
          const modified = env.lastModified
            ? env.lastModified.toLocaleDateString()
            : 'N/A';
          console.log(
            `${env.environment.padEnd(20)} ${String(env.keyCount).padEnd(8)} ${formatBytes(env.encryptedSize).padEnd(10)} ${modified}`
          );
        }

        console.log('-'.repeat(60));
        console.log(`Total: ${result.totalKeys} keys across ${result.environments.length} environment(s), ${formatBytes(result.totalSize)}`);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
