import type { Argv } from 'yargs';
import { exportEnv } from '../commands/export';

export function registerExportCommand(yargs: Argv): Argv {
  return yargs.command(
    'export <environment>',
    'Decrypt and export an environment file to disk',
    (y) =>
      y
        .positional('environment', {
          describe: 'Environment to export',
          type: 'string',
          demandOption: true,
        })
        .option('output', {
          alias: 'o',
          type: 'string',
          describe: 'Output file path (defaults to .env.<environment>.export)',
        }),
    async (argv) => {
      try {
        const outputPath = await exportEnv({
          environment: argv.environment as string,
          output: argv.output as string | undefined,
        });
        console.log(`✅ Exported to: ${outputPath}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`❌ Export failed: ${message}`);
        process.exit(1);
      }
    }
  );
}
