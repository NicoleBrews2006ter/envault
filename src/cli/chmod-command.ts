import { Command } from 'commander';
import { chmod, ChmodMode } from '../commands/chmod';

const VALID_MODES: ChmodMode[] = ['owner', 'group', 'world'];

export function registerChmodCommand(program: Command): void {
  program
    .command('chmod <environment> <mode>')
    .description(
      'Set file permissions on the encrypted env file (owner|group|world)'
    )
    .option('-d, --dir <path>', 'project directory', process.cwd())
    .action(async (environment: string, mode: string, options: { dir: string }) => {
      if (!VALID_MODES.includes(mode as ChmodMode)) {
        console.error(
          `Invalid mode "${mode}". Must be one of: ${VALID_MODES.join(', ')}.`
        );
        process.exit(1);
      }

      try {
        const result = await chmod(options.dir, environment, mode as ChmodMode);

        if (result.changed) {
          const prev = result.previousMode ? ` (was: ${result.previousMode})` : '';
          console.log(
            `✔ Permissions for "${result.environment}" set to "${result.mode}"${prev}.`
          );
        } else {
          console.log(
            `✔ Permissions for "${result.environment}" already set to "${result.mode}". No change.`
          );
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });
}
