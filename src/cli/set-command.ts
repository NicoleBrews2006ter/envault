import { Command } from "commander";
import { set } from "../commands/set";
import { unset } from "../commands/unset";

export function registerSetCommand(program: Command): void {
  program
    .command("set <environment> <key> <value>")
    .description("Set a key-value pair in an encrypted environment file")
    .option("-d, --dir <path>", "Project directory", process.cwd())
    .action(async (environment: string, key: string, value: string, opts: { dir: string }) => {
      try {
        await set(environment, key, value, { projectDir: opts.dir });
        console.log(`✔ Set ${key} in [${environment}]`);
      } catch (err: any) {
        console.error(`✖ ${err.message}`);
        process.exit(1);
      }
    });

  program
    .command("unset <environment> <key>")
    .description("Remove a key from an encrypted environment file")
    .option("-d, --dir <path>", "Project directory", process.cwd())
    .action(async (environment: string, key: string, opts: { dir: string }) => {
      try {
        const removed = await unset(environment, key, { projectDir: opts.dir });
        if (removed) {
          console.log(`✔ Removed ${key} from [${environment}]`);
        } else {
          console.log(`⚠ Key "${key}" not found in [${environment}]`);
        }
      } catch (err: any) {
        console.error(`✖ ${err.message}`);
        process.exit(1);
      }
    });
}
