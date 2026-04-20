import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { keys } from './keys';
import { writeConfig } from '../config/project';
import { writeKeys } from '../crypto/keyfile';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'envault-keys-test-'));
}

describe('keys', () => {
  it('throws if project not initialized', async () => {
    const dir = makeTempDir();
    await expect(keys(dir)).rejects.toThrow('No envault project found');
  });

  it('returns empty array when no keys stored', async () => {
    const dir = makeTempDir();
    writeConfig(dir, { project: 'myapp', environments: [] });
    const mockReadKeys = jest.fn().mockReturnValue({});
    jest.mock('../crypto/keyfile', () => ({ readKeys: mockReadKeys, writeKeys: jest.fn() }));
    const result = await keys(dir);
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns key entries with fingerprints', async () => {
    const dir = makeTempDir();
    writeConfig(dir, { project: 'testproj', environments: ['production', 'staging'] });

    const fakeKey = Buffer.alloc(32, 0xab).toString('base64');
    const storedKeys = {
      testproj: {
        production: { key: fakeKey, createdAt: '2024-01-01T00:00:00.000Z', algorithm: 'aes-256-gcm' },
        staging: { key: fakeKey, createdAt: '2024-02-01T00:00:00.000Z', algorithm: 'aes-256-gcm' },
      },
    };

    jest.doMock('../crypto/keyfile', () => ({ readKeys: () => storedKeys }));

    const { keys: keysCmd } = await import('./keys');
    const result = await keysCmd(dir);

    expect(result.length).toBe(2);
    expect(result[0].environment).toBe('production');
    expect(result[0].fingerprint).toHaveLength(16);
    expect(result[0].algorithm).toBe('aes-256-gcm');
    expect(result[1].environment).toBe('staging');
  });

  it('sorts results alphabetically by environment', async () => {
    const dir = makeTempDir();
    writeConfig(dir, { project: 'sorttest', environments: [] });
    const fakeKey = Buffer.alloc(32, 0x01).toString('base64');
    const storedKeys = {
      sorttest: {
        zeta: { key: fakeKey },
        alpha: { key: fakeKey },
        beta: { key: fakeKey },
      },
    };
    jest.doMock('../crypto/keyfile', () => ({ readKeys: () => storedKeys }));
    const { keys: keysCmd } = await import('./keys');
    const result = await keysCmd(dir);
    const names = result.map(e => e.environment);
    expect(names).toEqual([...names].sort());
  });
});
