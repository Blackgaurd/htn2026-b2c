# htn2026-b2c

Bun + React + shadcn/ui + `bun:sqlite`. One process serves the frontend and the API.
Mobile-shaped UI, demoed from a laptop browser.

Localhost only — not built to deploy, and always running on real data.

## Run

```bash
bun install
bun run db:seed    # optional: sample rows so the list isn't empty
bun dev            # http://localhost:3000
```

Other scripts:

```bash
bun run typecheck  # tsc --noEmit — catches contract drift between the two halves
bun run db:reset   # delete data.db and its WAL sidecars
```

## Who owns what

The split is by **directory**, so two people almost never touch the same file.

```
shared/api.ts     ← BOTH. The contract. Agree early, change loudly.
server/           ← backend person
  db.ts             schema + connection
  routes.ts         handlers  ← you live here
  index.ts          wiring (thin; edit only when adding a new path)
  seed.ts           sample rows
src/              ← frontend person
  api.ts            typed client — the ONLY file that calls fetch
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

Both people run their own server against their own `data.db`. The schema is created on
first boot, so the frontend is never blocked: `bun run db:seed` gives you real rows to
build screens against before anyone has written a feature.

Adding an endpoint:

1. Add the types to `shared/api.ts` (and a path if it's a new URL).
2. Backend: add a handler in `server/routes.ts`, register it in `server/index.ts`.
3. Frontend: add one exported function in `src/api.ts`.

Steps 2 and 3 are independent once step 1 is merged.

## Notes

- **SQLite is server-only.** `bun:sqlite` opens a file; browsers can't. Anything touching
  the DB lives in `server/`.
- **`data.db` is gitignored**, along with the `-wal`/`-shm` sidecars WAL mode creates.
  Everyone gets their own local DB — schema is code, data is not.
- **Schema changes** aren't migrated. `CREATE TABLE IF NOT EXISTS` won't alter an existing
  table, so after editing `server/db.ts` run `bun run db:reset && bun run db:seed`.
- **`PhoneFrame`** is demo chrome only (390×844, iPhone 14 Pro). It auto-scales down on
  short laptop screens. Delete it from `App.tsx` for a full-bleed layout.
- **No SSR, no file-based routing.** Client-rendered. Need multiple screens? `useState`
  for a screen index is usually enough for a demo; reach for `react-router` only if not.
