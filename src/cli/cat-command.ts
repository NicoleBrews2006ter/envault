import { Command } from 'commander';
import { cat } from '../commands/cat';

export function registerCatCommand(program: Command): void {
  program
    .command('cat <environment>')
    .description('Print decrypted contents of an environment file to stdout')
    .option('-d, --dir <dir>', 'Project directory', process.cwd())
    .action(async (environment: string, opts: { dir: string }) => {
      try {
        const contents = await cat({ environment, projectDir: opts.dir });
        process.stdout.write(contents);
        if (!contents.endsWith('\n')) {
          process.stdout.write('\n');
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
