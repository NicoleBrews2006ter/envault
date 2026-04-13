import { Command } from "commander";
import { mergeEnvironments } from "../commands/merge";

export function registerMergeCommand(program: Command): void {
  program
    .command("merge <source> <target>")
    .description("Merge variables from one environment into another")
    .option("-o, --overwrite", "Overwrite conflicting keys in target with values from source", false)
    .option("-d, --dir <path>", "Project directory", process.cwd())
    .action(async (source: string, target: string, options: { overwrite: boolean; dir: string }) => {
      try {
        const result = await mergeEnvironments(source, target, options.dir, options.overwrite);

        if (result.conflicts.length > 0 && !options.overwrite) {
          console.warn(`⚠  Conflicts detected (${result.conflicts.length} key(s) skipped):`);
          result.conflicts.forEach((key) => console.warn(`   - ${key}`));
          console.warn(`   Re-run with --overwrite to force merge.`);
        }

        if (result.merged > 0) {
          console.log(
            `✔  Merged ${result.merged} key(s) from "${source}" into "${target}".`
          );
        } else if (result.conflicts.length === 0) {
          console.log(`ℹ  No new keys to merge from "${source}" into "${target}".`);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`✖  ${message}`);
        process.exit(1);
      }
    });
}
