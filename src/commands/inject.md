# `envault inject`

Run any command with decrypted environment variables injected directly into the
child process — **without writing a plaintext `.env` file to disk**.

## Usage

```bash
envault inject <environment> -- <command> [args...]
```

## Examples

```bash
# Start a Node server with production secrets
envault inject production -- node dist/server.js

# Run database migrations with staging credentials
envault inject staging -- npx prisma migrate deploy

# Execute an arbitrary script
envault inject development -- bash scripts/seed.sh
```

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `-d, --dir <path>` | `cwd` | Project directory containing `.envault.json` |

## How it works

1. Reads the encrypted file for the given environment from `.envault/<env>.enc`.
2. Decrypts it in-memory using the passphrase stored in the local keyfile.
3. Parses the plaintext key=value pairs.
4. Spawns the supplied command via `spawnSync` with the parsed variables merged
   into `process.env`.
5. Forwards the child process exit code — no plaintext ever touches disk.

## Security notes

- The decrypted values exist only in the Node.js process heap for the duration
  of the spawn call.
- Set `ENVAULT_VERBOSE=1` to print a summary of how many variables were injected
  (useful for CI debugging without revealing values).
