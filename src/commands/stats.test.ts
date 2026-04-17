import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { stats } from './stats';
import { createDefaultConfig, writeConfig } from '../config/project';
import { storeKey } from '../crypto/keyfile';
import { encryptEnvFile } from '../crypto/envfile';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-stats-'));
}

describe('stats', () => {
  it('returns stats for all environments', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig('myapp');
    config.environments = ['production'];
    await writeConfig(dir, config);

    const envFile = path.join(dir, '.env.production');
    fs.writeFileSync(envFile, 'KEY1=val1\nKEY2=val2\n');

    const pass = 'test-passphrase-stats';
    await storeKey('myapp', 'production', pass);
    await encryptEnvFile(dir, 'production', pass);

    const result = await stats(dir);
    expect(result.project).toBe('myapp');
    expect(result.environments).toHaveLength(1);
    expect(result.environments[0].environment).toBe('production');
    expect(result.environments[0].keyCount).toBe(2);
    expect(result.environments[0].encryptedSize).toBeGreaterThan(0);
    expect(result.totalKeys).toBe(2);
  });

  it('handles missing encrypted file gracefully', async () => {
    const dir = makeTempDir();
    const config = createDefaultConfig('emptyapp');
    config.environments = ['staging'];
    await writeConfig(dir, config);

    const result = await stats(dir);
    expect(result.environments[0].keyCount).toBe(0);
    expect(result.environments[0].encryptedSize).toBe(0);
    expect(result.environments[0].lastModified).toBeNull();
  });
});
