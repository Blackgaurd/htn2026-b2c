/**
 * Compile-time guard: the database row must still satisfy the wire contract.
 *
 * `shared/api.ts` is hand-written and imports nothing, so nothing stops the schema
 * and the contract from drifting apart. The lines below do: if a column is renamed,
 * retyped, or dropped, `bun run typecheck` fails here instead of the frontend
 * finding out at runtime.
 *
 * Note `Bathroom` and `Review` are the *served* shapes (row + computed score or
 * aggregates), so the guard is against `BathroomRow` / `ReviewRow`, not those.
 * `users` carries an extra `password` column the contract has no field for — extra
 * properties don't break assignability, and `publicUser()` is what keeps it off
 * the wire.
 *
 * The three join tables aren't guarded because the contract has no type for them:
 * follows, bookmarks and want_to_go are only ever served as `UserSummary` or
 * `Bathroom`, which the handlers compose.
 *
 * Types only — erased at build, no runtime cost. Imported by `server/index.ts`
 * purely to keep it in the typecheck graph.
 */

import type { InferSelectModel } from "drizzle-orm";
import type { BathroomRow, ReviewRow, User } from "../shared/api";
import type { bathrooms, reviews, users } from "./schema";

const _bathroom: BathroomRow = {} as InferSelectModel<typeof bathrooms>;
const _user: User = {} as InferSelectModel<typeof users>;
const _review: ReviewRow = {} as InferSelectModel<typeof reviews>;

void _bathroom;
void _user;
void _review;

export {};
