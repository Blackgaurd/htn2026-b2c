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

## püpi — what we're building

Beli, for bathrooms. A mobile app (390×844, no desktop layout) for rating and
personally ranking every washroom in the E5 and E7 Waterloo Engineering buildings.
Lowercase with the umlaut — `püpi` — everywhere in user-facing copy.

### The one hard rule

**Users never create bathrooms.** The catalogue is a fixed, seeded list of the real
E5/E7 washrooms. "Adding a bathroom" means *picking one from the catalogue and
reviewing it*. There is no create-bathroom endpoint, no free-text bathroom name
field, no admin screen. A screen that lets a user type a new bathroom into existence
is a bug, not a feature.

### Washroom types and the visibility rule

`washroom_type` is `"female" | "male" | "universal"`. There is no "accessible" type —
accessibility is a detail rating and a flag on the room, not a category.

Every user picks a `washroom_pref` (the same three values) at register. It gates what
they can see:

- `female` → female + universal
- `male` → male + universal
- `universal` → universal only

The gate applies to search, the picker, compare and saving. Saving outside your
preference isn't just hidden in the UI — the operation rejects it, in the mock
client and in `server/routes.ts` alike.

**The friends feed is the one exception.** You see friends' reviews of any bathroom
regardless of type — that's the whole point of a social feed — but every feed row
renders an explicit type badge so it is never ambiguous which washroom is being
discussed. A feed row for a bathroom you can't use is read-only: no bookmark, no
review, no compare.

Implement the gate once, as a helper in `shared/api.ts` (`visibleTypes(pref)`), so the
frontend, the mock client and the server all filter through the same function.

### Scoring — pairwise, not stars

This is the core mechanic. Build it first; everything else is a list around it.

1. Pick a bathroom from the catalogue.
2. Give it 1–5 stars. That is the only input that touches the score, and it picks
   the band via `bucketForRating()`: 4–5★ loved, 3★ fine, 1–2★ never again. There is
   no separate "overall verdict" step — asking twice invites two answers that
   disagree.
3. The app runs a comparison duel *within that band*: "which was better?" against
   bathrooms you've already reviewed, binary-search style, ~3 comparisons max. Each
   answer halves the candidate range.
4. Your final position in your own ordered list produces the score, 0.0–10.0, spread
   across the band (loved ≈ 6.7–10, fine ≈ 3.4–6.6, never again ≈ 0–3.3).
   **The score is derived from rank. It is never typed in by the user.**
5. The very first review skips the duel and lands mid-band.

**A bathroom has exactly one score.** The optional detail ratings — cleanliness,
accessibility, smell, hygiene, privacy, and sanitary products in women's washrooms
only (`detailKeysFor`) — are notes about the room and are **never averaged into
anything**. A score is relative to everything else you've rated; folding an absolute
1–5 into it would be two scoring systems arguing. `client.test.ts` pins this: the
same review with all-1s details scores identically to one with no details at all.

Consequences worth holding onto:

- Inserting a new bathroom above an old one changes the old one's score. Persist
  **rank**; compute score from rank order on read. Don't store a score and let it rot.
- A bathroom has two numbers: *your* score and the global score (the mean of every
  user's personal score). Show both, never conflate them, always label which is which
  — that's what `ScorePair` is for. A score you haven't given is a dash, not a zero
  and not a "new" badge.
- The compare screen is the ranking engine, not a side feature. It needs a standalone
  entry point (re-rank two things you've already reviewed), but its main job is the
  tail end of the review flow.

### Screens

Plain components under `src/components/`, rendered by `App.tsx` inside `PhoneFrame`.
`App.tsx` holds a tagged-union `Screen` in `useState` — no router; the review flow's
steps carry data (the draft, the result) that a URL would have to invent a way to
hold. Shared pieces live in `components/chrome.tsx`; colours, labels and formatters
in `lib/display.ts`.

Five slots in the tab bar so the rate button sits in the middle:
**Home · Rankings · (+) · Saved · Profile**.

1. **Auth** — Register: name, email, username, then `washroom_pref` on a step of its
   own, because it decides what the whole app will show this person. Login is email
   only: no password is checked, no token, no sessions table. The current user id
   lives in `localStorage` under one key, touched only by `src/api.ts`,
   `src/mocks/client.ts` and `src/session.ts` — components never see storage. Mocks
   ship a signed-in default user so the app is one tap away.
2. **Home** — the feed, with search layered *over* it: results drop into a panel
   under the field and the feed stays put. No building filter, no floor chips, no
   sort control, no stat tiles. Searching is how you narrow; a fixed row of F1/F2/F3
   buttons only makes sense in a two-building app.
3. **Review flow** — `RateSelectScreen` (search only — it deliberately does *not*
   open on the whole catalogue, which is a wall rather than a starting point; the
   empty state offers what people you follow have rated and you haven't) →
   `RateScoreScreen` (one star row, then optional details, photos and a note).
   Opening the flow from a bathroom's detail page skips step 1.
4. **Compare** — `CompareScreen`, the duel. Two cards, tap the better one;
   `CompareResultScreen` reveals the score and the window of your list around where
   it landed. The binary search is in `src/lib/duel.ts`, pure and synchronous — the
   API only ever hears the final position.
5. **Detail** — the campus average and your score, side by side and labelled, plus
   your photos, note and details if you've rated it. Individual friends' ratings are
   *not* here; they live in the feed attached to a person and a moment.
6. **Rankings** — everything you've rated, best first. No podium and no medals: the
   list is already ordered, so a trophy stand restated the top three in a second
   visual language and pushed the real list below the fold. Rank is a number in a
   column, the same for #1 as for #12.
7. **Saved** — your bookmarks. Its own tab, not a tab inside Profile: it's a list you
   open standing in a hallway.
8. **Profile** — name, `washroom_pref`, rated count, following/followers, top rated.
   The counts are buttons; they open `PeopleScreen`, which is where finding and
   following people lives. Following is instant and one-directional — no request, no
   accept, no pending state.

Design rules that kept getting re-litigated, so they're written down:

- **No decorative icons.** Buttons say what they do in words. The star is the only
  drawn thing left, because it's the rating control rather than a label for one.
- **A bathroom's name is never truncated.** `E7 3rd Floor — North Wing, beside the
  stairwell` is the only thing distinguishing it from its neighbour, and the ellipsis
  ate exactly that part. It wraps. (Person names may still truncate — a clipped name
  is recoverable.)
- **Nothing repeats what the name already says.** The name contains the building and
  the floor, so there is no building tile and no "Floor 3" line beside it.
- **Three score colours**, green / yellow / red, and nothing else competes with them.
  Per-building colours are gone for the same reason.

### Data shape

Contract-first, same order as always: types + operations in `shared/api.ts` →
fixtures in `src/mocks/data.ts` → `src/mocks/client.ts` and `src/api.ts` → then
`server/schema.ts` + `server/routes.ts` catch up.

Expected domain types: `User`, `Bathroom` (the catalogue row — building, floor,
location, `washroom_type`, `accessible`), `Review` (user, bathroom, stars, the
optional details, photos, note, bucket, position), `Follow`, `Bookmark`, `WantToGo`.
These replace the scaffold's `Item`; the three compile-time guards stay exactly where
they are, just pointed at the new types.

`WantToGo` is still in the contract but has no UI: its only "add" control was on the
detail screen, which was pared back, so the tab could only ever shrink. The ops are
intact if it comes back.

Seed data is not optional here, and it isn't duplicated: `shared/catalogue.ts` holds
the washrooms and `shared/demo.ts` holds the people, follows and reviews. Both
`server/seed.ts` and `src/mocks/data.ts` read from them, so a mock demo and a live
demo show the same feed and the same global scores — which is what makes `?mock=0`
evidence the backend works rather than just a different-looking app.

Two things the fixtures have to keep being true, because the screens read as broken
otherwise: every demo review points at a washroom its author is actually allowed to
use, and different people disagree about the same bathroom. If everyone's #1 is the
same room, "your score" and "campus average" print the same number and the whole
distinction the app is built on disappears from the demo.

⚠️ The catalogue rooms are plausible but **not surveyed** — placeholders in the right
shape, waiting on the real E5/E7 audit. Ids are the part worth keeping stable, since
reviews point at them.

### Testing

`src/mocks/client.test.ts` (`bun test`) covers the rules that both implementations
have to hold: the gate refuses rather than hides, the feed crosses types and flags
what you can't use, scores stay inside their band, inserting at the top moves what
was there, re-rating replaces instead of stacking, detail ratings never move the
score, sanitary products are dropped outside women's washrooms, and the duel costs
⌈log₂(n+1)⌉ questions. When `server/routes.ts` lands, it has to pass the same list.

`src/render.test.tsx` server-renders every screen against real fixtures. Effects
don't run under `renderToString`, so fetching screens only reach their loading state
— that still catches a crash at module scope — while prop-driven ones render in full,
which is where the risky indexing lives.

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

- `shared/api.ts` — the contract (types + pure helpers + URL builders + the
  `ApiClient` operation surface). Imports nothing; ships to the browser. Both sides
  depend on it, so changing it breaks both builds. `visibleTypes()` and
  `scoreForPosition()` live here because both halves must agree on them exactly.
- `shared/catalogue.ts` — the fixed E5/E7 washroom list, and `shared/demo.ts` — the
  demo people and their reviews. Here rather than duplicated because `server/seed.ts`
  and `src/mocks/data.ts` both need the same rows with the same ids, and neither may
  import from the other. Types only as dependencies; safe in the browser bundle.
- `server/` — `db.ts` (schema), `routes.ts` (handlers), `index.ts` (wiring).
  Never imports from `src/`.
- `src/` — React. `src/api.ts` is the only file allowed to call `fetch` or know a
  URL; components import functions from it. Never imports from `server/`.
- `src/mocks/` — the fixture-backed `ApiClient`. Frontend territory; the backend
  person never opens it. Never imports from `server/` either.
- `src/session.ts` — the signed-in user id. Only `src/api.ts` and `src/mocks/client.ts`
  touch it; components never see storage.
- `Design bathroom rating app/` — the Figma Make export the UI was ported from.
  Reference material and its own Vite project; excluded in `tsconfig.json`. Don't
  build against it and don't import from it.
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

- `server/contract.ts` — a Drizzle row still satisfies `BathroomRow` / `User` /
  `ReviewRow`. **Currently a stub**: the schema still describes the scaffold's
  `items` table, so there's nothing yet to assert. Restore one line per table as
  each lands; the file lists them.
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
