import type { Command } from "commander";
import { whoami } from "../commands/whoami";

export function registerWhoamiCommand(program: Command): void {
  program
    .command("whoami")
    .description("Display current user identity and envault session info")
    .action(async () => {
      try {
        const result = await whoami(process.cwd());

        console.log(`User:        ${result.username}`);
        console.log(`Envault dir: ${result.envaultDir}`);

        if (result.projectName) {
          console.log(`Project:     ${result.projectName}`);
        } else {
          console.log(`Project:     (none — run 'envault init' to initialize)`);
        }

        if (result.environments.length > 0) {
          console.log(`Environments: ${result.environments.join(", ")}`);
        } else {
          console.log(`Environments: (none)`);
        }

        console.log(`Stored keys: ${result.keyCount}`);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
