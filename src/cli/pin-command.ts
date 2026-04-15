import { Command } from 'commander';
import { pin, unpin, checkPin } from '../commands/pin';

export function registerPinCommand(program: Command): void {
  const pinCmd = program
    .command('pin')
    .description('Pin, unpin, or check the integrity of an encrypted environment file');

  pinCmd
    .command('set <environment>')
    .description('Pin the current state of an encrypted environment file')
    .action(async (environment: string) => {
      try {
        const result = await pin(process.cwd(), environment);
        console.log(
          `Pinned "${result.environment}" at ${result.pinnedAt} (checksum: ${result.checksum.slice(0, 12)}...)`
        );
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  pinCmd
    .command('remove <environment>')
    .description('Remove the pin for an environment')
    .action(async (environment: string) => {
      try {
        await unpin(process.cwd(), environment);
        console.log(`Pin removed for "${environment}".`);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  pinCmd
    .command('check <environment>')
    .description('Check whether the current encrypted file matches its pin')
    .action(async (environment: string) => {
      try {
        const result = await checkPin(process.cwd(), environment);
        if (!result.pinned) {
          console.log(`No pin set for "${environment}".`);
          return;
        }
        if (result.valid) {
          console.log(
            `✔ "${environment}" matches its pin (set at ${result.pin!.pinnedAt}).`
          );
        } else {
          console.warn(
            `✘ "${environment}" has changed since it was pinned (set at ${result.pin!.pinnedAt}).`
          );
          process.exit(1);
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
