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

## OpenAPI

The backend API contract is in `openapi/openapi.yaml`. Generate its TypeScript types with:

```bash
bun run api:generate
```

The generated types are written to `src/renderer/src/api/generated/schema.d.ts`. Do not edit that file directly; update the OpenAPI document and regenerate instead.

## Backend

The renderer loads users, projects, and tickets from the backend and sends all board changes through the typed API client in `src/renderer/src/api/client.ts`. The base URL defaults to `http://localhost:3000`; override it with `VITE_API_BASE_URL` when running or building for another environment.

The app signs in and registers through the backend's `/auth/login` and `/auth/register` endpoints. The access token is kept in memory, sent as a Bearer token on API requests, and cleared on logout or when it expires/is rejected. You will need to sign in again after restarting the app. User records are loaded from the backend and offered as ticket-assignee suggestions.
