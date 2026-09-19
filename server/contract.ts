/**
 * Compile-time guard: the database row must still satisfy the wire contract.
 *
 * `shared/api.ts` is hand-written and imports nothing, so nothing stops the schema
 * and the contract from drifting apart. A line here does: if a column is renamed,
 * retyped, or dropped, `bun run typecheck` fails here instead of the frontend
 * finding out at runtime.
 *
 * ⚠️ Currently asserting nothing, because `server/schema.ts` still describes the
 * scaffold's `items` table and the app's tables don't exist yet. Restore the guard
 * as each table lands — one line per table:
 *
 *   const _bathroom: BathroomRow = {} as InferSelectModel<typeof bathrooms>;
 *   const _user: User = {} as InferSelectModel<typeof users>;
 *   const _review: ReviewRow = {} as InferSelectModel<typeof reviews>;
 *
 * Note `Bathroom` and `Review` are the *served* shapes (row + computed score or
 * aggregates), so the guard is against `BathroomRow` / `ReviewRow`, not those.
 *
 * Types only — erased at build, no runtime cost. Imported by `server/index.ts`
 * purely to keep it in the typecheck graph.
 */

export {};
