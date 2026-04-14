import { Command } from "commander";
import chalk from "chalk";
import { lint, LintResult } from "../commands/lint";

function formatLintResult(result: LintResult): void {
  const icon = result.valid ? chalk.green("✔") : chalk.red("✖");
  console.log(`${icon} ${chalk.bold(result.environment)}`);
  if (result.issues.length === 0) {
    console.log(`  ${chalk.gray("No issues found")}`);
  } else {
    for (const issue of result.issues) {
      const color = issue.severity === "error" ? chalk.red : chalk.yellow;
      console.log(`  ${color(issue.severity.toUpperCase())} [${issue.key}] ${issue.message}`);
    }
  }
}

export function registerLintCommand(program: Command): void {
  program
    .command("lint [environment]")
    .description("Check env files for common issues such as naming conventions and empty values")
    .option("--strict", "Exit with non-zero code if any warnings are found")
    .action(async (environment: string | undefined, options: { strict?: boolean }) => {
      try {
        const projectDir = process.cwd();
        const results = await lint(projectDir, environment);

        let hasErrors = false;
        let hasWarnings = false;

        for (const result of results) {
          formatLintResult(result);
          if (!result.valid) hasErrors = true;
          if (result.issues.some((i) => i.severity === "warning")) hasWarnings = true;
        }

        const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
        console.log(
          `\n${chalk.bold("Summary:")}: ${results.length} environment(s) checked, ${totalIssues} issue(s) found`
        );

        if (hasErrors || (options.strict && hasWarnings)) {
          process.exit(1);
        }
      } catch (err: any) {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
}
