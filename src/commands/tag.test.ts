import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { tagEnvironment } from './tag';
import { writeConfig } from '../config/project';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-tag-test-'));
}

const baseConfig = {
  version: 1,
  environments: {
    production: { encryptedFile: '.env.production.enc', tags: ['live'] },
    staging: { encryptedFile: '.env.staging.enc' },
  },
};

describe('tagEnvironment', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = makeTempDir();
    await writeConfig(tmpDir, JSON.parse(JSON.stringify(baseConfig)));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('lists tags for an environment', async () => {
    const result = await tagEnvironment(tmpDir, 'production', 'list');
    expect(result.action).toBe('listed');
    expect(result.tags).toEqual(['live']);
  });

  it('lists empty tags when none exist', async () => {
    const result = await tagEnvironment(tmpDir, 'staging', 'list');
    expect(result.action).toBe('listed');
    expect(result.tags).toEqual([]);
  });

  it('adds a new tag to an environment', async () => {
    const result = await tagEnvironment(tmpDir, 'staging', 'add', 'critical');
    expect(result.action).toBe('added');
    expect(result.tags).toContain('critical');
  });

  it('normalizes tag to lowercase', async () => {
    const result = await tagEnvironment(tmpDir, 'staging', 'add', 'MyTag');
    expect(result.tags).toContain('mytag');
  });

  it('throws if adding a duplicate tag', async () => {
    await expect(tagEnvironment(tmpDir, 'production', 'add', 'live')).rejects.toThrow(
      'already exists'
    );
  });

  it('removes an existing tag', async () => {
    const result = await tagEnvironment(tmpDir, 'production', 'remove', 'live');
    expect(result.action).toBe('removed');
    expect(result.tags).not.toContain('live');
  });

  it('throws if removing a non-existent tag', async () => {
    await expect(tagEnvironment(tmpDir, 'production', 'remove', 'ghost')).rejects.toThrow(
      'does not exist'
    );
  });

  it('throws for invalid tag characters', async () => {
    await expect(tagEnvironment(tmpDir, 'staging', 'add', 'bad tag!')).rejects.toThrow(
      'Invalid tag'
    );
  });

  it('throws if environment does not exist', async () => {
    await expect(tagEnvironment(tmpDir, 'nonexistent', 'list')).rejects.toThrow(
      'does not exist'
    );
  });

  it('throws if tag is missing for add action', async () => {
    await expect(tagEnvironment(tmpDir, 'staging', 'add')).rejects.toThrow(
      'tag name is required'
    );
  });
});
