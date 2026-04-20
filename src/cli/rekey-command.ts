import { Command } from 'commander';
import { rekey } from '../commands/rekey';

export function registerRekeyCommand(program: Command): void {
  program
    .command('rekey <environment>')
    .description('Re-encrypt an environment with a newly generated passphrase')
    .option('-p, --passphrase <passphrase>', 'Use a specific new passphrase instead of generating one')
    .option('-d, --dir <dir>', 'Project directory (defaults to current directory)')
    .action(async (environment: string, options: { passphrase?: string; dir?: string }) => {
      try {
        const result = await rekey({
          environment,
          projectDir: options.dir,
          newPassphrase: options.passphrase,
        });

        console.log(`✔ Rekeyed environment: ${result.environment}`);
        console.log(`  Old key fingerprint : ${result.oldFingerprint}`);
        console.log(`  New key fingerprint : ${result.newFingerprint}`);
        console.log(`  Encrypted file      : ${result.encryptedPath}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });
}
