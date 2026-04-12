import { Argv } from "yargs";
import { lockEnv } from "../commands/lock";

export function registerLockCommand(yargs: Argv): Argv {
  return yargs.command(
    "lock [env]",
    "Encrypt the .env file and prepare it for secure storage",
    (y) =>
      y.positional("env", {
        describe: "Name of the env entry to lock",
        type: "string",
        default: "default",
      }),
    async (argv) => {
      const projectDir = process.cwd();
      const envName = argv.env as string;

      console.log(`Locking env "${envName}"...`);

      const result = await lockEnv(projectDir, envName);

      if (!result.success) {
        console.error(`Error: ${result.error}`);
        process.exit(1);
      }

      console.log(`✔ Encrypted env saved to: ${result.encryptedPath}`);
      console.log(`  Commit the encrypted file to share with your team.`);
    }
  );
}
