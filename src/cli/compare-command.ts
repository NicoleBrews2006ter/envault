import { Command } from "commander";
import { compare } from "../commands/compare";
import * as path from "path";

function formatRow(label: string, keys: string[], symbol: string): void {
  if (keys.length === 0) return;
  console.log(`\n${label}:`);
  for (const key of keys.sort()) {
    console.log(`  ${symbol} ${key}`);
  }
}

export function registerCompareCommand(program: Command): void {
  program
    .command("compare <envA> <envB>")
    .description("Compare two environments and show key differences")
    .option("-d, --dir <path>", "Project directory", process.cwd())
    .option("--only-diff", "Show only differing or missing keys")
    .action(async (envA: string, envB: string, options: { dir: string; onlyDiff?: boolean }) => {
      try {
        const projectDir = path.resolve(options.dir);
        const result = await compare(projectDir, envA, envB);

        const total =
          result.onlyInA.length +
          result.onlyInB.length +
          result.different.length +
          result.same.length;

        console.log(`Comparing "${envA}" vs "${envB}" (${total} total keys)`);

        formatRow(`Only in ${envA}`, result.onlyInA, "-");
        formatRow(`Only in ${envB}`, result.onlyInB, "+");
        formatRow("Different values", result.different, "~");

        if (!options.onlyDiff) {
          formatRow("Same values", result.same, "=");
        }

        console.log(
          `\nSummary: ${result.onlyInA.length} removed, ${result.onlyInB.length} added, ` +
            `${result.different.length} changed, ${result.same.length} unchanged`
        );
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
