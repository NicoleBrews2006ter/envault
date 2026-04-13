import * as fs from 'fs';
import * as path from 'path';
import { readConfig, writeConfig } from '../config/project';

export interface TagResult {
  environment: string;
  tags: string[];
  action: 'added' | 'removed' | 'listed';
}

export async function tagEnvironment(
  projectDir: string,
  environment: string,
  action: 'add' | 'remove' | 'list',
  tag?: string
): Promise<TagResult> {
  const config = await readConfig(projectDir);

  if (!config.environments || !config.environments[environment]) {
    throw new Error(`Environment "${environment}" does not exist.`);
  }

  if (!config.environments[environment].tags) {
    config.environments[environment].tags = [];
  }

  const tags: string[] = config.environments[environment].tags!;

  if (action === 'list') {
    return { environment, tags: [...tags], action: 'listed' };
  }

  if (!tag) {
    throw new Error(`A tag name is required for action "${action}".`);
  }

  const normalizedTag = tag.trim().toLowerCase();
  if (!/^[a-z0-9_-]+$/.test(normalizedTag)) {
    throw new Error(`Invalid tag "${tag}". Tags must be alphanumeric, dashes, or underscores.`);
  }

  if (action === 'add') {
    if (tags.includes(normalizedTag)) {
      throw new Error(`Tag "${normalizedTag}" already exists on environment "${environment}".`);
    }
    tags.push(normalizedTag);
    config.environments[environment].tags = tags;
    await writeConfig(projectDir, config);
    return { environment, tags: [...tags], action: 'added' };
  }

  if (action === 'remove') {
    const index = tags.indexOf(normalizedTag);
    if (index === -1) {
      throw new Error(`Tag "${normalizedTag}" does not exist on environment "${environment}".`);
    }
    tags.splice(index, 1);
    config.environments[environment].tags = tags;
    await writeConfig(projectDir, config);
    return { environment, tags: [...tags], action: 'removed' };
  }

  throw new Error(`Unknown action: ${action}`);
}
