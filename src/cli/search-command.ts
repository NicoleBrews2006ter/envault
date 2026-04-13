import { Command } from "commander";
import chalk from "chalk";
import { search, SearchMatch } from "../commands/search";

function formatSearchRow(match: SearchMatch, showValues: boolean): string {
  const env = chalk.cyan(match.environment.padEnd(16));
  const key = chalk.yellow(match.key.padEnd(30));
  if (showValues) {
    const value = chalk.gray(match.value.slice(0, 40) + (match.value.length > 40 ? "..." : ""));
    return `  ${env} ${key} ${value}`;
  }
  return `  ${env} ${key}`;
}

export function registerSearchCommand(program: Command): void {
  program
    .command("search <query>")
    .description("Search for keys or values across all environments")
    .option("--keys-only", "Search only in key names")
    .option("--values-only", "Search only in values")
    .option("--case-sensitive", "Enable case-sensitive matching")
    .option("--no-values", "Hide values in output")
    .action(async (query: string, opts) => {
      try {
        const projectDir = process.cwd();
        const matches = await search(projectDir, query, {
          keys: !opts.valuesOnly,
          values: !opts.keysOnly,
          caseSensitive: opts.caseSensitive ?? false,
        });

        if (matches.length === 0) {
          console.log(chalk.yellow(`No matches found for "${query}".`));
          return;
        }

        console.log(chalk.bold(`\nSearch results for "${query}" (${matches.length} match${matches.length !== 1 ? "es" : ""}):\n`));
        const header = `  ${"ENVIRONMENT".padEnd(16)} ${"KEY".padEnd(30)}${opts.values !== false ? " VALUE" : ""}`;
        console.log(chalk.dim(header));
        console.log(chalk.dim("  " + "-".repeat(70)));

        for (const match of matches) {
          console.log(formatSearchRow(match, opts.values !== false));
        }
        console.log();
      } catch (err: any) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}
