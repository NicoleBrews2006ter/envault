import { Command } from "commander";
import { restore } from "../commands/restore";
import * as path from "path";

export function registerRestoreCommand(program: Command): void {
  program
    .command("restore <environment> <snapshot>")
    .description("Restore a snapshot for a given environment to a .env file")
    .option("-o, --output <path>", "Output path for the restored .env file")
    .option("-f, --force", "Overwrite output file if it already exists", false)
    .action(async (environment: string, snapshot: string, options: { output?: string; force: boolean }) => {
      const projectDir = process.cwd();
      try {
        const result = await restore(projectDir, {
          environment,
          snapshot,
          output: options.output ? path.resolve(options.output) : undefined,
          force: options.force,
        });
        console.log(
          `✔ Restored snapshot "${result.snapshot}" for environment "${result.environment}" to ${result.outputPath}`
        );
      } catch (err: any) {
        console.error(`✘ ${err.message}`);
        process.exit(1);
      }
    });
}
