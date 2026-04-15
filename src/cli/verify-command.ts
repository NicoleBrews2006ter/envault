import { Command } from 'commander';
import * as path from 'path';
import { verify, VerifyResult } from '../commands/verify';

function formatVerifyRow(result: VerifyResult): string {
  const status = result.decryptable ? '✓' : '✗';
  const keyIcon = result.keyExists ? '🔑' : '  ';
  const fileIcon = result.encryptedFileExists ? '📄' : '  ';
  const errorStr = result.error ? ` (${result.error})` : '';
  return `  ${status} ${result.environment.padEnd(20)} ${fileIcon} file  ${keyIcon} key${errorStr}`;
}

export function registerVerifyCommand(program: Command): void {
  program
    .command('verify [environment]')
    .description('Verify that encrypted env files are intact and decryptable')
    .option('-d, --dir <path>', 'project directory', process.cwd())
    .action(async (environment: string | undefined, options: { dir: string }) => {
      const projectDir = path.resolve(options.dir);
      try {
        const results = await verify(projectDir, environment);
        const allOk = results.every(r => r.decryptable);

        console.log('\nenvault verify\n');
        console.log('  ENV                  FILE    KEY');
        console.log('  ' + '─'.repeat(45));
        results.forEach(r => console.log(formatVerifyRow(r)));
        console.log();

        if (allOk) {
          console.log('✓ All environments verified successfully.');
        } else {
          const failed = results.filter(r => !r.decryptable).length;
          console.error(`✗ ${failed} environment(s) failed verification.`);
          process.exit(1);
        }
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
