import { Command } from 'commander';
import { registerInitCommand } from './init-command';
import { registerAddCommand } from './add-command';
import { registerLockCommand } from './lock-command';
import { registerUnlockCommand } from './unlock-command';
import { registerListCommand } from './list-command';
import { registerRotateCommand } from './rotate-command';
import { registerRemoveCommand } from './remove-command';
import { registerExportCommand } from './export-command';
import { registerImportCommand } from './import-command';
import { registerStatusCommand } from './status-command';
import { registerInfoCommand } from './info-command';
import { registerCopyCommand } from './copy-command';
import { registerRenameCommand } from './rename-command';

const program = new Command();

program
  .name('envault')
  .description('Manage and encrypt per-project .env files with team-sharing support')
  .version('1.0.0');

registerInitCommand(program);
registerAddCommand(program);
registerLockCommand(program);
registerUnlockCommand(program);
registerListCommand(program);
registerRotateCommand(program);
registerRemoveCommand(program);
registerExportCommand(program);
registerImportCommand(program);
registerStatusCommand(program);
registerInfoCommand(program);
registerCopyCommand(program);
registerRenameCommand(program);

program.parse(process.argv);
