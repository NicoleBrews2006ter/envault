import * as fs from "fs";
import { Command } from "commander";
import { template } from "../commands/template";

export function registerTemplateCommand(program: Command): void {
  program
    .command("template <environment> <templateFile>")
    .description("Render a template file using values from an encrypted environment")
    .option("-o, --output <file>", "Write rendered output to a file instead of stdout")
    .option("-d, --dir <path>", "Project directory", process.cwd())
    .option("--strict", "Exit with error if any template keys are missing", false)
    .action(async (environment: string, templateFile: string, options) => {
      try {
        if (!fs.existsSync(templateFile)) {
          console.error(`Template file not found: ${templateFile}`);
          process.exit(1);
        }

        const templateContent = fs.readFileSync(templateFile, "utf-8");
        const result = await template(
          options.dir,
          environment,
          templateContent,
          options.output
        );

        if (result.missingKeys.length > 0) {
          console.warn(
            `Warning: ${result.missingKeys.length} placeholder(s) not resolved: ${result.missingKeys.join(", ")}`
          );
          if (options.strict) {
            process.exit(1);
          }
        }

        if (options.output) {
          console.log(`Rendered template written to ${options.output}`);
        } else {
          process.stdout.write(result.output);
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
