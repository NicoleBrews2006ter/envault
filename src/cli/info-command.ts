import { Command } from 'commander';
import { runInfo } from '../commands/info';

export function registerInfoCommand(program: Command): void {
  program
    .command('info')
    .description('Display information about the current envault project configuration')
    .option('-e, --env <environment>', 'Show info for a specific environment')
    .action(async (options: { env?: string }) => {
      try {
        const result = await runInfo({
          environment: options.env,
          cwd: process.cwd(),
        });

        console.log('');
        console.log(`  Project:      ${result.projectName}`);
        console.log(`  Config:       ${result.configPath}`);
        console.log(`  Environments: ${result.environments.join(', ') || '(none)'}`);

        if (result.activeEnvironment) {
          console.log(`  Active:       ${result.activeEnvironment}`);
        }

        if (result.environmentDetail) {
          const detail = result.environmentDetail;
          console.log('');
          console.log(`  Environment Detail: ${detail.name}`);
          console.log(`    Encrypted file: ${detail.encryptedPath}`);
          console.log(`    File exists:    ${detail.fileExists ? 'yes' : 'no'}`);
          console.log(`    Key stored:     ${detail.keyStored ? 'yes' : 'no'}`);
          console.log(`    Variable count: ${detail.variableCount ?? 'unknown'}`);
        }

        console.log('');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });
}
