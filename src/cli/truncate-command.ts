import { Command } from "commander";
import { truncate } from "../commands/truncate";

export function registerTruncateCommand(program: Command): void {
  program
    .command("truncate <environment>")
    .description("Remove lines from the top or bottom of an environment file")
    .requiredOption("-n, --lines <number>", "Number of lines to remove", parseInt)
    .option("-f, --from <position>", "Remove from 'top' or 'bottom' (default: bottom)", "bottom")
    .action(async (environment: string, options: { lines: number; from: "top" | "bottom" }) => {
      try {
        if (isNaN(options.lines) || options.lines <= 0) {
          console.error("Error: --lines must be a positive integer.");
          process.exit(1);
        }

        if (options.from !== "top" && options.from !== "bottom") {
          console.error("Error: --from must be 'top' or 'bottom'.");
          process.exit(1);
        }

        const result = await truncate(process.cwd(), environment, {
          lines: options.lines,
          from: options.from,
        });

        console.log(
          `Removed ${result.removed} line(s) from the ${options.from} of '${environment}'. ${result.remaining} line(s) remaining.`
        );
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
