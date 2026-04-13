import { Command } from 'commander';
import { tagEnvironment, listTags, removeTag } from '../commands/tag';

export function registerTagCommand(program: Command): void {
  const tag = program
    .command('tag')
    .description('Manage tags for environments');

  tag
    .command('add <environment> <tag>')
    .description('Add a tag to an environment')
    .option('-c, --config <path>', 'path to config file')
    .action(async (environment: string, tagName: string, options: { config?: string }) => {
      try {
        await tagEnvironment(environment, tagName, options.config);
        console.log(`Tag "${tagName}" added to environment "${environment}"`);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  tag
    .command('remove <environment> <tag>')
    .description('Remove a tag from an environment')
    .option('-c, --config <path>', 'path to config file')
    .action(async (environment: string, tagName: string, options: { config?: string }) => {
      try {
        await removeTag(environment, tagName, options.config);
        console.log(`Tag "${tagName}" removed from environment "${environment}"`);
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });

  tag
    .command('list [environment]')
    .description('List tags for an environment or all environments')
    .option('-c, --config <path>', 'path to config file')
    .action(async (environment: string | undefined, options: { config?: string }) => {
      try {
        const results = await listTags(environment, options.config);
        if (results.length === 0) {
          console.log('No tags found.');
          return;
        }
        for (const { env, tags } of results) {
          console.log(`${env}: ${tags.length > 0 ? tags.join(', ') : '(none)'}`);
        }
      } catch (err: any) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
      }
    });
}
