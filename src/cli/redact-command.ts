import { Command } from 'commander';
import { redact } from '../commands/redact';

export function registerRedactCommand(program: Command): void {
  program
    .command('redact <environment> <keys...>')
    .description('Print a decrypted .env file with specified keys redacted (values replaced by a placeholder)')
    .option('-p, --placeholder <text>', 'Placeholder text to use for redacted values', '***REDACTED***')
    .option('-d, --dir <path>', 'Project directory', process.cwd())
    .action(async (environment: string, keys: string[], opts: { placeholder: string; dir: string }) => {
      try {
        const result = await redact(opts.dir, environment, keys, opts.placeholder);

        if (result.redacted === 0) {
          console.warn(`Warning: no matching keys found — nothing was redacted.`);
        } else {
          console.error(`[envault] Redacted ${result.redacted} key(s) for environment "${environment}".`);
        }

        // Print the (partially) redacted content to stdout so it can be piped
        process.stdout.write(result.output);
      } catch (err: unknown) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
