import { Command } from 'commander';
import { renameEnvironment } from '../commands/rename';

export function registerRenameCommand(program: Command): void {
  program
    .command('rename <old-name> <new-name>')
    .description('Rename an environment')
    .option('-d, --dir <path>', 'Project directory', process.cwd())
    .action(async (oldName: string, newName: string, opts: { dir: string }) => {
      try {
        await renameEnvironment(oldName, newName, { projectDir: opts.dir });
        console.log(`✔ Environment "${oldName}" renamed to "${newName}".`);
      } catch (err: any) {
        console.error(`✖ ${err.message}`);
        process.exit(1);
      }
    });
}
