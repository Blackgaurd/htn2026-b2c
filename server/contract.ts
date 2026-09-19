/**
 * Compile-time guard: the database row must still satisfy the wire contract.
 *
 * `shared/api.ts` is hand-written and imports nothing, so nothing stops the schema
 * and the contract from drifting apart. This line does: if a column is renamed,
 * retyped, or dropped, `bun run typecheck` fails here instead of the frontend
 * finding out at runtime.
 *
 * Types only — erased at build, no runtime cost. Imported by `server/index.ts`
 * purely to keep it in the typecheck graph.
 */

import type { InferSelectModel } from "drizzle-orm";
import type { Item } from "../shared/api";
import type { items } from "./schema";

type ItemRow = InferSelectModel<typeof items>;

// Fails to compile if a row can no longer be served as an `Item`.
const _rowSatisfiesContract: Item = {} as ItemRow;
void _rowSatisfiesContract;
