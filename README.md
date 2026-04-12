# envault

> A CLI tool for managing and encrypting per-project `.env` files with team-sharing support via Git.

---

## Installation

```bash
npm install -g envault
```

---

## Usage

Initialize envault in your project and encrypt your `.env` file:

```bash
# Initialize a new vault in the current project
envault init

# Encrypt your .env file with a shared team key
envault encrypt --file .env --key YOUR_TEAM_KEY

# Decrypt and restore the .env file (e.g., after cloning the repo)
envault decrypt --file .env.vault --key YOUR_TEAM_KEY

# Push the encrypted vault file to your Git remote
envault push

# Pull and decrypt the latest vault from Git
envault pull --key YOUR_TEAM_KEY
```

The encrypted `.env.vault` file is safe to commit to your repository. Team members can decrypt it using the shared key, keeping secrets out of plaintext while still version-controlled.

---

## How It Works

1. `envault encrypt` reads your `.env` file and produces an encrypted `.env.vault` file.
2. You commit `.env.vault` to Git (add `.env` to `.gitignore`).
3. Teammates run `envault decrypt` with the shared key to restore their local `.env`.

---

## Requirements

- Node.js >= 18
- Git

---

## License

[MIT](./LICENSE)