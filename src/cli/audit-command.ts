import { Command } from "commander";
import { runAudit, AuditResult } from "../commands/audit";

function formatAuditResult(result: AuditResult): void {
  const { environment, issues, checkedAt } = result;

  console.log(`\nAudit: ${environment}`);
  console.log(`Checked at: ${new Date(checkedAt).toLocaleString()}`);

  if (issues.length === 0) {
    console.log("  ✓ No issues found");
    return;
  }

  const bySeverity = {
    error: issues.filter((i) => i.severity === "error"),
    warning: issues.filter((i) => i.severity === "warning"),
    info: issues.filter((i) => i.severity === "info"),
  };

  if (bySeverity.error.length > 0) {
    console.log(`  ✗ Errors (${bySeverity.error.length}):`);
    bySeverity.error.forEach((i) => console.log(`    - ${i.message}`));
  }

  if (bySeverity.warning.length > 0) {
    console.log(`  ⚠ Warnings (${bySeverity.warning.length}):`);
    bySeverity.warning.forEach((i) => console.log(`    - ${i.message}`));
  }

  if (bySeverity.info.length > 0) {
    console.log(`  ℹ Info (${bySeverity.info.length}):`);
    bySeverity.info.forEach((i) => console.log(`    - ${i.message}`));
  }
}

export function registerAuditCommand(program: Command): void {
  program
    .command("audit [environment]")
    .description("Audit environment files for security and consistency issues")
    .option("-a, --all", "Audit all environments")
    .option("-s, --severity <level>", "Minimum severity to report (error|warning|info)", "info")
    .option("--json", "Output results as JSON")
    .action(async (environment: string | undefined, options) => {
      try {
        const results = await runAudit({
          environment,
          all: options.all,
          minSeverity: options.severity,
        });

        if (options.json) {
          console.log(JSON.stringify(results, null, 2));
          return;
        }

        results.forEach(formatAuditResult);

        const totalErrors = results.reduce(
          (sum, r) => sum + r.issues.filter((i) => i.severity === "error").length,
          0
        );

        if (totalErrors > 0) {
          process.exit(1);
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
