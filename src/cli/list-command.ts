import { Argv } from "yargs";
import * as path from "path";
import { listEnvironments, EnvironmentInfo } from "../commands/list";

export function registerListCommand(yargs: Argv): Argv {
  return yargs.command(
    "list",
    "List all environments for the current project",
    (y) => y,
    async () => {
      const projectDir = process.cwd();
      try {
        const result = await listEnvironments(projectDir);

        if (result.environments.length === 0) {
          console.log("No environments configured. Use `envault add <env>` to add one.");
          return;
        }

        console.log("Environments:");
        result.environments.forEach((env: EnvironmentInfo) => {
          const lockStatus = env.isLocked ? "🔒 locked" : "🔓 unlocked";
          const keyStatus = env.hasKey ? "✓ key stored" : "✗ no key";
          console.log(`  ${env.name.padEnd(20)} ${lockStatus.padEnd(16)} ${keyStatus}`);
        });
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    }
  );
}
