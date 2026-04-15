import { Command } from 'commander';
import { fetch } from '../commands/fetch';

export function registerFetchCommand(program: Command): void {
  program
    .command('fetch [environments...]')
    .description('Decrypt and fetch environment files from encrypted vault')
    .option('-f, --force', 'overwrite existing output files', false)
    .option('-o, --output-dir <dir>', 'directory to write decrypted files to', process.cwd())
    .action(async (environments: string[], options: { force: boolean; outputDir: string }) => {
      const projectDir = process.cwd();

      try {
        const results = await fetch(projectDir, environments, {
          force: options.force,
          outputDir: options.outputDir,
        });

        if (results.length === 0) {
          console.log('No environments found to fetch.');
          return;
        }

        for (const result of results) {
          if (result.skipped) {
            console.warn(`  skipped  ${result.environment}: ${result.reason}`);
          } else {
            console.log(`  fetched  ${result.environment} → ${result.outputPath}`);
          }
        }

        const fetched = results.filter((r) => !r.skipped).length;
        const skipped = results.filter((r) => r.skipped).length;
        console.log(`\nDone. ${fetched} fetched, ${skipped} skipped.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });
}
