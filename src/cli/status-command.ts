import { Command } from 'commander';
import chalk from 'chalk';
import { statusCommand, EnvironmentStatus } from '../commands/status';

function formatEnvironmentRow(env: EnvironmentStatus): string {
  const lockIcon = env.isLocked ? chalk.yellow('🔒 locked') : env.envFileExists ? chalk.green('🔓 unlocked') : chalk.gray('— not present');
  const keyIcon = env.hasKey ? chalk.green('✔') : chalk.red('✘');
  const encIcon = env.encryptedFileExists ? chalk.green('✔') : chalk.gray('—');
  return `  ${chalk.bold(env.name.padEnd(20))} ${lockIcon.padEnd(25)} key: ${keyIcon}  encrypted: ${encIcon}`;
}

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show the status of all environments in the current project')
    .action(async () => {
      try {
        const result = await statusCommand(process.cwd());

        if (!result.initialized) {
          console.log(chalk.yellow('Project is not initialized. Run `envault init` to get started.'));
          process.exit(1);
        }

        console.log(chalk.bold('\nEnvault Project Status\n'));
        console.log(`  ${'Environment'.padEnd(20)} ${'State'.padEnd(25)} Key  Encrypted`);
        console.log('  ' + '─'.repeat(60));

        for (const env of result.environments) {
          console.log(formatEnvironmentRow(env));
        }

        console.log();
      } catch (err: any) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}
