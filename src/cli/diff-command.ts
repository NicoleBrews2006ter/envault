import { Command } from 'commander';
import chalk from 'chalk';
import { diffCommand } from '../commands/diff';

export function registerDiffCommand(program: Command): void {
  program
    .command('diff <environment>')
    .description('Show differences between the encrypted vault and a plaintext .env file')
    .option('-f, --file <path>', 'Path to plaintext .env file (defaults to ./.env)')
    .action(async (environment: string, options: { file?: string }) => {
      try {
        const result = await diffCommand(environment, options.file);

        const hasChanges =
          result.onlyInEncrypted.length > 0 ||
          result.onlyInPlaintext.length > 0 ||
          result.changed.length > 0;

        if (!hasChanges) {
          console.log(chalk.green(`✔ No differences found for environment "${environment}".`));
          console.log(chalk.gray(`  ${result.unchanged} key(s) are identical.`));
          return;
        }

        console.log(chalk.bold(`\nDiff for environment: ${chalk.cyan(environment)}\n`));

        if (result.onlyInEncrypted.length > 0) {
          console.log(chalk.red('  Keys only in vault (missing from plaintext):'));
          result.onlyInEncrypted.forEach(k => console.log(chalk.red(`    - ${k}`)));
        }

        if (result.onlyInPlaintext.length > 0) {
          console.log(chalk.yellow('  Keys only in plaintext (not yet locked):'));
          result.onlyInPlaintext.forEach(k => console.log(chalk.yellow(`    + ${k}`)));
        }

        if (result.changed.length > 0) {
          console.log(chalk.blue('  Keys with changed values:'));
          result.changed.forEach(k => console.log(chalk.blue(`    ~ ${k}`)));
        }

        if (result.unchanged > 0) {
          console.log(chalk.gray(`\n  ${result.unchanged} key(s) unchanged.`));
        }
      } catch (err: any) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}
