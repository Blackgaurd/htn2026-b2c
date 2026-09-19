# htn2026-b2c

Bun + React + shadcn/ui + Drizzle ORM over `bun:sqlite`. One process serves the
frontend and the API. Mobile-shaped UI, demoed from a laptop browser.

Localhost only — not built to deploy. The frontend runs on fixtures by default so it
never waits on the API; `?mock=0` switches it to real data from `data.db`.

## Run

```bash
bun install
bun run db:push    # create/update the tables — REQUIRED on a fresh clone
bun run db:seed    # optional: sample rows so the list isn't empty
bun dev            # http://localhost:3000
```

`db:push` is not optional the first time. The schema is no longer created when the
server boots, so without it every query fails with `no such table: items`.

Other scripts:

```bash
bun run typecheck  # tsc --noEmit — catches contract drift between the two halves
bun run db:studio  # Drizzle Studio: browse/edit data.db in a GUI
bun run db:reset   # delete data.db and its WAL sidecars (stop the server first)
```

## Who owns what

The split is by **directory**, so two people almost never touch the same file.

```
shared/api.ts     ← FRONTEND owns it. The contract. Backend implements it.
server/           ← backend person
  schema.ts         Drizzle table definitions — single source of truth for the DB
  db.ts             connection (bun:sqlite wrapped in Drizzle)
  routes.ts         handlers  ← you live here
  contract.ts       type-only guard: schema must still satisfy shared/api.ts
  index.ts          wiring (thin; edit only when adding a new path)
  seed.ts           sample rows
src/              ← frontend person
  api.ts            typed client — the ONLY file that calls fetch
  mocks/            fixture-backed stand-in for the whole backend
  App.tsx           shell
  components/       screens  ← you live here
  components/ui/    shadcn primitives (generated; don't hand-edit)
```

Rules that keep it conflict-free:

- Components import from `src/api.ts`. Never `fetch`, never a URL, never SQL.
- Handlers return types from `shared/api.ts`. Never import anything from `src/`.
- `shared/api.ts` imports nothing. It ships to the browser.

## The contract

`shared/api.ts` holds the types and the URL builders both sides use:

```ts
export type Item = { id: number; title: string; done: boolean; created_at: string };

export const paths = {
  items: "/api/items",
  item: (id: number | string) => `/api/items/${id}`,
};
```

Change a field here and `bun run typecheck` immediately fails on both sides — that's the
feature. Say it out loud before you do it.

## Working in parallel

Both people run their own server against their own `data.db`. The frontend is never
blocked on the API: it runs on the fixtures in `src/mocks/` by default, so whole screens
get built and demoed before a single handler exists. Add `?mock=0` to the URL to point
the same build at the real backend.

`shared/api.ts` is the frontend's file. It declares what the UI needs; the backend
catches up. A field in the contract with no column behind it is a to-do, not a bug — so
don't shrink the contract to match the server.

Adding an endpoint:

1. Frontend: add the types and the `ApiClient` operation to `shared/api.ts` (and a path
   if it's a new URL).
2. Frontend: add the fixture to `src/mocks/data.ts`, implement it in
   `src/mocks/client.ts` and `src/api.ts`. The screen is buildable now.
3. Backend: add a handler in `server/routes.ts`, register it in `server/index.ts`.

Step 3 can land hours later. Nothing waits on it.

## Notes

- **SQLite is server-only.** `bun:sqlite` opens a file; browsers can't. Anything touching
  the DB lives in `server/`.
- **`data.db` is gitignored**, along with the `-wal`/`-shm` sidecars WAL mode creates.
  Everyone gets their own local DB — schema is code, data is not.
- **Schema changes:** edit `server/schema.ts`, then `bun run db:push`. The table is altered
  in place and existing rows survive — no migration files, no reset. If the change could
  lose data (new `NOT NULL` column, dropped column), drizzle-kit asks for confirmation, so
  run it in a real terminal rather than piping its output.
- **Drizzle wraps `bun:sqlite`; it doesn't replace it.** `server/db.ts` still opens the
  `Database` and sets the WAL pragma. Queries stay synchronous — `.all()` / `.get()` /
  `.run()`, no `await`.
- **`done` is a real boolean** end to end. SQLite stores 0/1, but the column is declared
  `integer("done", { mode: "boolean" })`, so nothing in the backend converts it by hand.
- **`@libsql/client` is a devDependency for the CLI only.** `drizzle-kit` needs its own
  driver to connect (it can't use `bun:sqlite`, and Bun can't load `better-sqlite3`). The
  app itself never imports it.
- **`PhoneFrame`** is demo chrome only (390×844, iPhone 14 Pro). It auto-scales down on
  short laptop screens. Delete it from `App.tsx` for a full-bleed layout.
- **No SSR, no file-based routing.** Client-rendered. Need multiple screens? `useState`
  for a screen index is usually enough for a demo; reach for `react-router` only if not.
