import { Command } from 'commander';
import { renameKey } from '../commands/rename-key';

export function registerRenameKeyCommand(program: Command): void {
  program
    .command('rename-key <environment> <old-key> <new-key>')
    .description('Rename a key within an encrypted environment file')
    .action(async (environment: string, oldKey: string, newKey: string) => {
      try {
        await renameKey(environment, oldKey, newKey, process.cwd());
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
