import { Command } from "commander";
import { watch } from "../commands/watch";

export function registerWatchCommand(program: Command): void {
  program
    .command("watch <environment>")
    .description(
      "Watch a .env file for changes and automatically re-encrypt it"
    )
    .option("-d, --dir <path>", "Project directory (defaults to cwd)")
    .action(async (environment: string, opts: { dir?: string }) => {
      try {
        const projectDir = opts.dir ?? process.cwd();
        const result = await watch({ environment, projectDir }, (event, filePath) => {
          console.log(`[envault] Re-encrypted ${filePath} (${event})`);
        });

        console.log(
          `Watching ${result.filePath} for changes. Press Ctrl+C to stop.`
        );

        process.on("SIGINT", () => {
          result.stop();
          console.log("\nStopped watching.");
          process.exit(0);
        });

        process.on("SIGTERM", () => {
          result.stop();
          process.exit(0);
        });
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
