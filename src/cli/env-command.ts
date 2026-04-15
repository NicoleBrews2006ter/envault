import { Command } from "commander";
import { env, formatEnvOutput } from "../commands/env";

export function registerEnvCommand(program: Command): void {
  program
    .command("env <environment>")
    .description(
      "Print decrypted environment variables for a given environment"
    )
    .option(
      "-f, --format <format>",
      "Output format: dotenv, export, or json",
      "dotenv"
    )
    .option(
      "-d, --dir <dir>",
      "Project directory",
      process.cwd()
    )
    .action(async (environment: string, options: { format: string; dir: string }) => {
      const format = options.format as "export" | "dotenv" | "json";
      if (!["export", "dotenv", "json"].includes(format)) {
        console.error(
          `Invalid format '${format}'. Choose from: export, dotenv, json`
        );
        process.exit(1);
      }
      try {
        const result = await env(options.dir, environment, format);
        const output = formatEnvOutput(result.variables, format);
        console.log(output);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
