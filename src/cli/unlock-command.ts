import { Argv } from 'yargs';
import { unlockEnv } from '../commands/unlock';

export function registerUnlockCommand(yargs: Argv): Argv {
  return yargs.command(
    'unlock [environment]',
    'Decrypt an encrypted .env file for the current project',
    (y) =>
      y
        .positional('environment', {
          describe: 'The environment to unlock (e.g. staging, production)',
          type: 'string',
          default: 'default',
        })
        .option('dir', {
          alias: 'd',
          type: 'string',
          describe: 'Project directory (defaults to current working directory)',
        }),
    async (argv) => {
      const result = await unlockEnv({
        environment: argv.environment as string,
        projectDir: argv.dir as string | undefined,
      });

      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.error(`❌ ${result.message}`);
        process.exit(1);
      }
    }
  );
}
