import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { statusCommand } from './status';
import { writeConfig } from '../config/project';
import { writeKeys } from '../crypto/keyfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-status-test-'));
}

describe('statusCommand', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns not initialized when config does not exist', async () => {
    const result = await statusCommand(tmpDir);
    expect(result.initialized).toBe(false);
    expect(result.environments).toHaveLength(0);
  });

  it('returns initialized with environment statuses', async () => {
    writeConfig(tmpDir, { projectId: 'proj-1', environments: ['development', 'production'] });
    const result = await statusCommand(tmpDir);
    expect(result.initialized).toBe(true);
    expect(result.environments).toHaveLength(2);
    expect(result.environments[0].name).toBe('development');
    expect(result.environments[0].hasKey).toBe(false);
    expect(result.environments[0].envFileExists).toBe(false);
    expect(result.environments[0].encryptedFileExists).toBe(false);
  });

  it('detects existing env file', async () => {
    writeConfig(tmpDir, { projectId: 'proj-1', environments: ['development'] });
    fs.writeFileSync(path.join(tmpDir, '.env.development'), 'KEY=value');
    const result = await statusCommand(tmpDir);
    expect(result.environments[0].envFileExists).toBe(true);
    expect(result.environments[0].isLocked).toBe(false);
  });

  it('detects locked state when only encrypted file exists', async () => {
    writeConfig(tmpDir, { projectId: 'proj-1', environments: ['development'] });
    const encDir = path.join(tmpDir, '.envault');
    fs.mkdirSync(encDir, { recursive: true });
    fs.writeFileSync(path.join(encDir, 'development.env.enc'), 'encrypted');
    const result = await statusCommand(tmpDir);
    expect(result.environments[0].isLocked).toBe(true);
    expect(result.environments[0].encryptedFileExists).toBe(true);
  });
});
