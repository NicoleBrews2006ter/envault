import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { touch } from './touch';
import { createDefaultConfig, writeConfig } from '../config/project';
import { writeKeys } from '../crypto/keyfile';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-touch-'));
}

describe('touch', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
    const config = createDefaultConfig('touch-test');
    writeConfig(tmpDir, config);
    writeKeys({ [config.projectId]: 'passphrase-abc' });
  });

  it('creates a new encrypted placeholder if environment does not exist', async () => {
    const result = await touch(tmpDir, 'staging');
    expect(result.existed).toBe(false);
    expect(result.environment).toBe('staging');
    expect(fs.existsSync(result.path)).toBe(true);
    const contents = JSON.parse(fs.readFileSync(result.path, 'utf-8'));
    expect(contents.empty).toBe(true);
  });

  it('updates mtime if environment already exists', async () => {
    const first = await touch(tmpDir, 'production');
    const mtimeBefore = fs.statSync(first.path).mtimeMs;
    await new Promise(r => setTimeout(r, 20));
    const second = await touch(tmpDir, 'production');
    const mtimeAfter = fs.statSync(second.path).mtimeMs;
    expect(second.existed).toBe(true);
    expect(mtimeAfter).toBeGreaterThanOrEqual(mtimeBefore);
  });

  it('throws if project is not initialised', async () => {
    await expect(touch('/nonexistent-dir', 'dev')).rejects.toThrow('No envault project found');
  });
});
