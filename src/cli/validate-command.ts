import { Command } from "commander";
import { validateCommand } from "../commands/validate";

export function registerValidateCommand(program: Command): void {
  program
    .command("validate [environment]")
    .description(
      "Validate encrypted env files for integrity and required keys"
    )
    .option(
      "-r, --required <keys>",
      "comma-separated list of required keys to check for",
      ""
    )
    .option("-a, --all", "validate all environments", false)
    .action(async (environment: string | undefined, options) => {
      const requiredKeys = options.required
        ? options.required
            .split(",")
            .map((k: string) => k.trim())
            .filter(Boolean)
        : [];

      try {
        const results = await validateCommand({
          environment: options.all ? undefined : environment,
          requiredKeys,
          all: options.all,
        });

        let hasErrors = false;

        for (const result of results) {
          if (result.valid) {
            console.log(`✓ [${result.environment}] Valid`);
            if (result.keyCount !== undefined) {
              console.log(`  Keys: ${result.keyCount}`);
            }
          } else {
            hasErrors = true;
            console.error(`✗ [${result.environment}] Invalid`);
            for (const error of result.errors) {
              console.error(`  - ${error}`);
            }
          }
        }

        if (hasErrors) {
          process.exit(1);
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
