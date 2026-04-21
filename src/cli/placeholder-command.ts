import { Command } from 'commander';
import * as path from 'path';
import { placeholder } from '../commands/placeholder';

export function registerPlaceholderCommand(program: Command): void {
  program
    .command('placeholder <template> <environment>')
    .description('Render a template file by substituting {{VAR}} placeholders with decrypted env values')
    .option('-o, --output <path>', 'Output file path (default: template path without .template extension)')
    .option('-d, --dir <path>', 'Project directory', process.cwd())
    .action(async (templateArg: string, environment: string, options: { output?: string; dir: string }) => {
      const templatePath = path.resolve(options.dir, templateArg);

      let outputPath: string;
      if (options.output) {
        outputPath = path.resolve(options.dir, options.output);
      } else {
        // Strip .template from extension if present, e.g. config.template.yml -> config.yml
        const base = path.basename(templatePath).replace(/\.template(\.[^.]+)?$/, '$1');
        outputPath = path.join(path.dirname(templatePath), base);
        if (outputPath === templatePath) {
          outputPath = templatePath + '.out';
        }
      }

      try {
        const result = await placeholder(templatePath, environment, outputPath, options.dir);
        console.log(`✔ Rendered ${result.substituted} placeholder(s) → ${result.outputPath}`);
        if (result.missing.length > 0) {
          console.warn(`⚠ Missing variables (left unchanged): ${result.missing.join(', ')}`);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Error: ${message}`);
        process.exit(1);
      }
    });
}
