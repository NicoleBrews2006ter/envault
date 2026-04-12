import { Command } from 'commander';
import * as path from 'path';
import { initProject } from '../commands/init';

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize envault for the current project')
    .option('-n, --name <name>', 'Project name (defaults to directory name)')
    .option('-e, --env-file <file>', 'Path to the .env file to manage', '.env')
    .option('-f, --force', 'Reinitialize even if already set up', false)
    .action(async (options) => {
      const cwd = process.cwd();

      console.log('Initializing envault...');

      const result = await initProject(cwd, {
        projectName: options.name,
        envFile: options.envFile,
        force: options.force,
      });

      if (!result.success) {
        console.error(`Error: ${result.message}`);
        process.exit(1);
      }

      console.log(`✔ ${result.message}`);

      if (result.configPath) {
        console.log(`  Config written to: ${path.relative(cwd, result.configPath)}`);
      }

      if (result.passphrase) {
        console.log('');
        console.log('Your encryption passphrase (save this securely):');
        console.log(`  ${result.passphrase}`);
        console.log('');
        console.log('Share this passphrase with teammates so they can decrypt the vault.');
        console.log('Add .envault/keys to your .gitignore to keep local keys private.');
      }
    });
}
