import { Command } from 'commander';
import * as path from 'path';
import { pack } from '../commands/pack';

export function registerPackCommand(program: Command): void {
  program
    .command('pack')
    .description('Bundle all encrypted environment files into a single portable archive')
    .option('-o, --output <path>', 'Output path for the bundle file')
    .option(
      '--include-keys',
      'Include encryption keys in the bundle (use with caution)',
      false
    )
    .option(
      '-d, --dir <path>',
      'Project directory (defaults to current directory)',
      process.cwd()
    )
    .action(async (options) => {
      try {
        const projectDir = path.resolve(options.dir);
        const outputPath = options.output
          ? path.resolve(options.output)
          : undefined;

        const result = await pack(projectDir, outputPath, options.includeKeys);

        console.log(`✔ Bundle created: ${result.outputPath}`);
        console.log(
          `  Environments packed: ${result.environments.join(', ')}`
        );

        if (result.includedKeys) {
          console.warn(
            '  ⚠ Warning: Encryption keys are included in the bundle. Keep it secure!'
          );
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`✖ ${message}`);
        process.exit(1);
      }
    });
}
