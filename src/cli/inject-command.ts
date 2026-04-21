import { Command } from 'commander';
import { inject } from '../commands/inject';

export function registerInjectCommand(program: Command): void {
  program
    .command('inject <environment> -- <command...>')
    .description('Run a command with decrypted env vars injected (no plaintext file written)')
    .option('-d, --dir <path>', 'Project directory', process.cwd())
    .allowUnknownOption(true)
    .action(async (environment: string, commandArgs: string[], options: { dir: string }) => {
      // Commander may not split args after '--' correctly in all versions;
      // fall back to parsing process.argv manually.
      const sepIdx = process.argv.indexOf('--');
      const resolvedArgs = sepIdx !== -1 ? process.argv.slice(sepIdx + 1) : commandArgs;

      if (!resolvedArgs || resolvedArgs.length === 0) {
        console.error('Error: No command provided after --');
        process.exit(1);
      }

      try {
        const result = await inject(options.dir, environment, resolvedArgs);
        // process.exitCode already set inside inject(); just surface the count.
        if (process.env.ENVAULT_VERBOSE) {
          console.error(
            `[envault] Injected ${result.injected} variable(s) from "${result.environment}" into: ${result.command}`
          );
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
