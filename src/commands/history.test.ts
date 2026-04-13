import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { history, appendHistory, readHistory } from './history';
import { createDefaultConfig, writeConfig } from '../config/project';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-history-test-'));
}

describe('history command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig('test-project');
    writeConfig(tmpDir, config);
    fs.mkdirSync(path.join(tmpDir, '.envault'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when no history exists', () => {
    const entries = history(tmpDir);
    expect(entries).toEqual([]);
  });

  it('appends and reads history entries', () => {
    appendHistory(tmpDir, { action: 'lock', environment: 'production' });
    appendHistory(tmpDir, { action: 'unlock', environment: 'staging' });
    const raw = readHistory(tmpDir);
    expect(raw).toHaveLength(2);
    expect(raw[0].action).toBe('lock');
    expect(raw[1].action).toBe('unlock');
  });

  it('returns entries in reverse chronological order', () => {
    appendHistory(tmpDir, { action: 'lock', environment: 'production' });
    appendHistory(tmpDir, { action: 'rotate', environment: 'production' });
    const entries = history(tmpDir);
    expect(entries[0].action).toBe('rotate');
    expect(entries[1].action).toBe('lock');
  });

  it('filters by environment', () => {
    appendHistory(tmpDir, { action: 'lock', environment: 'production' });
    appendHistory(tmpDir, { action: 'lock', environment: 'staging' });
    const entries = history(tmpDir, { environment: 'production' });
    expect(entries).toHaveLength(1);
    expect(entries[0].environment).toBe('production');
  });

  it('limits number of results', () => {
    for (let i = 0; i < 5; i++) {
      appendHistory(tmpDir, { action: 'lock', environment: 'production' });
    }
    const entries = history(tmpDir, { limit: 3 });
    expect(entries).toHaveLength(3);
  });

  it('throws if no config found', () => {
    const emptyDir = makeTempDir();
    expect(() => history(emptyDir)).toThrow('No envault config found');
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });
});
