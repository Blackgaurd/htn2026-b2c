---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

## This project

Bun fullstack app: one process serves the React frontend and the JSON API.
Entry point is `server/index.ts`. Run with `bun dev`. On a fresh clone the tables must
be created first with `bun run db:push` — the schema is NOT created at server boot.
Sample rows: `bun run db:seed`.

Data access goes through Drizzle ORM over `bun:sqlite`:

- `server/schema.ts` is the single source of truth for the database. Edit it, then
  `bun run db:push` to apply — never hand-write DDL or `ALTER TABLE`.
- Queries stay synchronous (`.all()` / `.get()` / `.run()`). Don't make handlers async
  just to query.
- `server/contract.ts` is a type-only guard asserting the Drizzle row still satisfies
  `Item` in `shared/api.ts`. Keep it imported from `server/index.ts`.
- `@libsql/client` is a devDependency used only by the `drizzle-kit` CLI. Never import
  it from application code.

Localhost-only by design: no deploy target, no build or static-export step. Don't add
either back without being asked.

## Git

Work on `main` and push straight to it. Don't create a branch, don't open a PR, don't
ask whether to branch first — this is a hackathon repo with no review gate, and the
usual "branch off the default branch" reflex just adds friction here.

Committing and pushing still only happen when asked.

Never reference `process.env` from anything under `src/`. It is browser code — an
unset var ships a literal `process.env.X` and the page dies with `Can't find
variable: process`, and a `typeof process` guard cannot rescue it (the guard is
always false in a browser, so an inlined value is never read). Config that the
frontend needs comes from the server over HTTP, or from the URL.

Layered on purpose so two people can work in parallel — respect the boundaries:

- `shared/api.ts` — the contract (types + URL builders + the `ApiClient` operation
  surface). Imports nothing; ships to the browser. Both sides depend on it, so
  changing it breaks both builds.
- `server/` — `db.ts` (schema), `routes.ts` (handlers), `index.ts` (wiring).
  Never imports from `src/`.
- `src/` — React. `src/api.ts` is the only file allowed to call `fetch` or know a
  URL; components import functions from it. Never imports from `server/`.
- `src/mocks/` — the fixture-backed `ApiClient`. Frontend territory; the backend
  person never opens it. Never imports from `server/` either.
- `src/components/ui/` — generated shadcn primitives. Don't hand-edit.

After changing `shared/api.ts`, run `bun run typecheck` — it catches drift between
the two halves.

## Who owns the contract

`shared/api.ts` is **owned by the frontend**. The frontend declares the shape and the
operations it needs; the backend's job is to catch up and serve exactly that.

A field in the contract that `data.db` doesn't have yet is a backend to-do, **not** a
frontend bug. Never edit the contract to match what the server currently returns, and
never narrow a type or drop an operation because the handler isn't written. The
failing typecheck is the message getting through, not damage to repair.

The frontend never blocks on the API. It is built against `src/mocks/`, which
implements the same `ApiClient` surface with hand-written fixtures. **The whole UI must
stay reachable and demoable with the server stopped** — if a screen only works against
a live backend, that's a bug in the screen.

- `src/mocks/data.ts` — fixtures typed as the contract's domain types. **When
  `shared/api.ts` changes, these change in the same commit.** They won't compile
  otherwise, and that is the enforcement — not a convention anyone has to remember.
- `src/mocks/client.ts` — the `ApiClient` implementation. Mutates an in-memory copy of
  the fixtures so create/update/delete really work in-session and reset on reload.
  Mirrors `server/routes.ts` where the behaviour is observable. No latency
  simulation, no injected failures — don't add either without being asked.
- `src/mocks/enabled.ts` — `USE_MOCKS`, read from the URL (never `process.env`).
  Mocks are ON by default; `?mock=0` hits the real API. Hydrating against the real
  backend for good is flipping that one default.

Three compile-time guards now keep the halves honest. Run `bun run typecheck` after
touching `shared/api.ts`:

- `server/contract.ts` — a Drizzle row still satisfies `Item`.
- `src/api.ts` — the HTTP client still satisfies `ApiClient`.
- `src/mocks/client.ts` — the mock client still satisfies `ApiClient`.

## Extending the frontend

Feature descriptions arrive as long prose. Build them **inside** the existing skeleton,
not around it — the scaffold is the spec for structure, the prose is the spec for
behaviour.

- Screens are plain components under `src/components/`, rendered by `App.tsx` inside
  `PhoneFrame`. Design for 390×844 mobile, not desktop.
- Components talk to `../api` only. Never `fetch`, never a URL, never `paths`, never
  `src/mocks/` directly.
- New data need, in this order: add the type and the operation to `ApiClient` in
  `shared/api.ts` → add the fixture to `src/mocks/data.ts` → implement it in
  `src/mocks/client.ts` and `src/api.ts`. The screen is fully buildable at that point;
  the handler in `server/routes.ts` lands whenever the backend gets there.
- `src/components/ui/` is generated shadcn. Add primitives with the CLI; don't
  hand-edit them, and don't hand-roll a button that already exists there.
- Don't introduce a router, a data-fetching library, or a state manager unless asked.
  `useState` for a screen index is usually enough.

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
