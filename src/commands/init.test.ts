import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { initProject } from './init';
import { configExists, readConfig } from '../config/project';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-init-test-'));
}

describe('initProject', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should create config and return success on first init', async () => {
    const result = await initProject(tmpDir, { projectName: 'test-project' });
    expect(result.success).toBe(true);
    expect(result.configPath).toBeDefined();
    expect(result.passphrase).toBeDefined();
    expect(configExists(tmpDir)).toBe(true);
  });

  it('should create .env file if it does not exist', async () => {
    await initProject(tmpDir, { projectName: 'test-project' });
    expect(fs.existsSync(path.join(tmpDir, '.env'))).toBe(true);
  });

  it('should store the project name in config', async () => {
    await initProject(tmpDir, { projectName: 'my-app' });
    const config = readConfig(tmpDir);
    expect(config?.projectName).toBe('my-app');
  });

  it('should fail if already initialized and force is not set', async () => {
    await initProject(tmpDir, { projectName: 'test-project' });
    const result = await initProject(tmpDir, { projectName: 'test-project' });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/already initialized/);
  });

  it('should reinitialize when force is true', async () => {
    await initProject(tmpDir, { projectName: 'test-project' });
    const result = await initProject(tmpDir, { projectName: 'test-project', force: true });
    expect(result.success).toBe(true);
  });

  it('should use basename of cwd as default project name', async () => {
    await initProject(tmpDir);
    const config = readConfig(tmpDir);
    expect(config?.projectName).toBe(path.basename(tmpDir));
  });
});
