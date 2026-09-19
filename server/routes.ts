/**
 * API handlers. Backend territory — this is the file the backend person lives in.
 *
 * ⚠️ NOT WRITTEN YET. The frontend has moved to the püpi contract and is running
 * entirely on `src/mocks/`; these handlers are the work that makes `?mock=0` real.
 * The scaffold's `items` CRUD was deleted rather than left to rot — it referenced
 * contract types that no longer exist.
 *
 * The to-do list is `ApiClient` in `shared/api.ts`: every operation there needs a
 * handler here, returning exactly the shape the contract declares. In rough
 * dependency order:
 *
 *   1. `server/schema.ts` — users, bathrooms, reviews, follows, bookmarks,
 *      want_to_go. Then `bun run db:push`.
 *   2. `server/seed.ts` — write `CATALOGUE` from `shared/catalogue.ts` and the
 *      people/reviews from `shared/demo.ts` into those tables. Same ids as the
 *      mocks use, so both demos show the same thing.
 *   3. Session: `POST /api/register`, `POST /api/login`, `GET /api/me`. The
 *      signed-in user arrives as the `x-pupi-user` header — see `src/api.ts`.
 *      No tokens, no hashing (CLAUDE.md).
 *   4. Everything else, in `routePatterns` order.
 *
 * Two behaviours are not optional, because `src/mocks/client.ts` already has them
 * and the two implementations must be indistinguishable:
 *
 *   - Score is computed from `position` on read via `scoreForPosition()`. Never
 *     store a score column.
 *   - `visibleTypes(pref)` gates every read and write except `GET /api/feed`,
 *     which returns all types and sets `can_use` per row. Rejecting a bookmark
 *     outside the gate is the server's job, not the screen's.
 *
 * Queries go through Drizzle but stay synchronous (`.all()` / `.get()` / `.run()`).
 */

export const handlers = {};
