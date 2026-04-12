import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  configExists,
  createDefaultConfig,
  getConfigPath,
  readConfig,
  writeConfig,
} from './project';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-test-'));
}

describe('project config', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('getConfigPath returns correct path', () => {
    expect(getConfigPath(tmpDir)).toBe(path.join(tmpDir, '.envault.json'));
  });

  test('configExists returns false when no config present', () => {
    expect(configExists(tmpDir)).toBe(false);
  });

  test('configExists returns true after writing config', () => {
    const config = createDefaultConfig('my-project');
    writeConfig(config, tmpDir);
    expect(configExists(tmpDir)).toBe(true);
  });

  test('createDefaultConfig produces valid config shape', () => {
    const config = createDefaultConfig('test-app');
    expect(config.projectName).toBe('test-app');
    expect(config.version).toBe('1.0.0');
    expect(config.encryptedFile).toBe('.env.vault');
    expect(config.gitTracked).toBe(true);
    expect(typeof config.createdAt).toBe('string');
  });

  test('writeConfig and readConfig round-trip', () => {
    const config = createDefaultConfig('round-trip-project');
    writeConfig(config, tmpDir);
    const loaded = readConfig(tmpDir);
    expect(loaded).toEqual(config);
  });

  test('readConfig throws when config is missing', () => {
    expect(() => readConfig(tmpDir)).toThrow("Run 'envault init' first.");
  });
});
