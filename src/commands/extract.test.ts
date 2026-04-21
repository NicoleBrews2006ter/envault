import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { extract } from './extract';
import { createDefaultConfig, writeConfig } from '../config/project';
import { writeKeys } from '../crypto/keyfile';
import { encryptEnvFile, getEncryptedPath } from '../crypto/envfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-extract-'));
}

async function setupProject(dir: string, env: string, contents: string): Promise<string> {
  const config = createDefaultConfig();
  config.environments = [env];
  writeConfig(dir, config);

  const envFile = path.join(dir, `.env.${env}`);
  fs.writeFileSync(envFile, contents, 'utf-8');

  const passphrase = 'test-passphrase-extract';
  writeKeys(dir, { [env]: passphrase });
  await encryptEnvFile(envFile, getEncryptedPath(dir, env), passphrase);

  return passphrase;
}

describe('extract', () => {
  it('extracts specified keys to output file', async () => {
    const dir = makeTempDir();
    const contents = 'DB_HOST=localhost\nDB_PORT=5432\nAPI_KEY=secret\nDEBUG=true\n';
    await setupProject(dir, 'production', contents);

    const output = path.join(dir, 'extracted.env');
    const result = await extract('production', ['DB_HOST', 'API_KEY'], output, dir);

    expect(result.keys).toEqual(['DB_HOST', 'API_KEY']);
    expect(result.environment).toBe('production');
    expect(result.outputFile).toBe(output);

    const written = fs.readFileSync(output, 'utf-8');
    expect(written).toContain('DB_HOST=localhost');
    expect(written).toContain('API_KEY=secret');
    expect(written).not.toContain('DB_PORT');
    expect(written).not.toContain('DEBUG');
  });

  it('throws if environment does not exist', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig();
    config.environments = ['staging'];
    writeConfig(dir, config);

    await expect(
      extract('production', ['KEY'], path.join(dir, 'out.env'), dir)
    ).rejects.toThrow('Environment "production" does not exist');
  });

  it('throws if a requested key is missing', async () => {
    const dir = makeTempDir();
    const contents = 'EXISTING=value\n';
    await setupProject(dir, 'dev', contents);

    await expect(
      extract('dev', ['EXISTING', 'MISSING_KEY'], path.join(dir, 'out.env'), dir)
    ).rejects.toThrow('Keys not found in environment "dev": MISSING_KEY');
  });

  it('throws if project is not initialized', async () => {
    const dir = makeTempDir();
    await expect(
      extract('dev', ['KEY'], path.join(dir, 'out.env'), dir)
    ).rejects.toThrow('No envault project found');
  });
});
