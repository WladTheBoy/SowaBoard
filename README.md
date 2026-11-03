# app

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [Biome](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
# SowaBoard

## Profile

On first launch, create a profile with a username (3–32 letters, numbers, dots, underscores, or hyphens) and a password (8–128 characters). Sign out from the profile area to switch users or sign back in. Each profile has its own projects and tickets.

Profiles and board data are stored on this device only; there is no server-based authentication or cross-device sync. Passwords are stored as scrypt hashes.
