import { Command } from "commander";
import { prune } from "../commands/prune";

export function registerPruneCommand(program: Command): void {
  program
    .command("prune")
    .description("Remove orphaned encrypted files that no longer have a corresponding environment entry")
    .option("-e, --env <environment>", "limit pruning to a specific environment")
    .option("-d, --dry-run", "show what would be removed without deleting", false)
    .option("-f, --force", "skip confirmation prompt", false)
    .action(async (options) => {
      try {
        const result = await prune({
          environment: options.env,
          dryRun: options.dryRun,
          force: options.force,
        });

        if (result.removed.length === 0) {
          console.log("No orphaned files found.");
          return;
        }

        if (options.dryRun) {
          console.log(`Would remove ${result.removed.length} orphaned file(s):`);
        } else {
          console.log(`Removed ${result.removed.length} orphaned file(s):`);
        }

        for (const file of result.removed) {
          console.log(`  - ${file}`);
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
