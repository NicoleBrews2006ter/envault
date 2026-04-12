import { Argv } from "yargs";
import { removeEnvironment } from "../commands/remove";

export function registerRemoveCommand(yargs: Argv): Argv {
  return yargs.command(
    "remove <environment>",
    "Remove an environment and its encrypted data from the project",
    (y) =>
      y.positional("environment", {
        describe: "The environment to remove (e.g. staging)",
        type: "string",
        demandOption: true,
      }),
    async (argv) => {
      const environment = argv.environment as string;

      try {
        const result = await removeEnvironment(environment, {
          projectDir: process.cwd(),
        });

        console.log(`✅ Removed environment: ${result.environment}`);
        if (result.removedKey) {
          console.log(`   🔑 Encryption key removed from keyfile.`);
        }
        if (result.removedFile) {
          console.log(`   🗑️  Encrypted env file deleted.`);
        }
        if (!result.removedKey && !result.removedFile) {
          console.log(`   ℹ️  No key or encrypted file was found to remove.`);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`❌ Error: ${message}`);
        process.exit(1);
      }
    }
  );
}
