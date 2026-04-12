import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, deriveKey } from './encryption';
import * as crypto from 'crypto';

describe('deriveKey', () => {
  it('produces a 32-byte key', () => {
    const salt = crypto.randomBytes(16);
    const key = deriveKey('secret', salt);
    expect(key.length).toBe(32);
  });

  it('produces the same key for the same inputs', () => {
    const salt = crypto.randomBytes(16);
    const key1 = deriveKey('secret', salt);
    const key2 = deriveKey('secret', salt);
    expect(key1.equals(key2)).toBe(true);
  });
});

describe('encrypt / decrypt', () => {
  it('roundtrips plaintext', () => {
    const original = 'DB_HOST=localhost\nDB_PASS=s3cr3t';
    const passphrase = 'my-strong-passphrase';
    const ciphertext = encrypt(original, passphrase);
    const result = decrypt(ciphertext, passphrase);
    expect(result).toBe(original);
  });

  it('produces different ciphertext on each call (random IV/salt)', () => {
    const passphrase = 'passphrase';
    const ct1 = encrypt('hello', passphrase);
    const ct2 = encrypt('hello', passphrase);
    expect(ct1).not.toBe(ct2);
  });

  it('throws on wrong passphrase', () => {
    const ciphertext = encrypt('secret data', 'correct-pass');
    expect(() => decrypt(ciphertext, 'wrong-pass')).toThrow('Decryption failed');
  });

  it('throws on corrupted ciphertext', () => {
    expect(() => decrypt('notvalidbase64!!!', 'pass')).toThrow();
  });

  it('handles empty string', () => {
    const passphrase = 'empty-test';
    const ct = encrypt('', passphrase);
    expect(decrypt(ct, passphrase)).toBe('');
  });
});
