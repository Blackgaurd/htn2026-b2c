/**
 * Puts sample rows in the local database: `bun run db:seed`.
 *
 * Real data in real SQLite — just pre-made, so a fresh clone has something on
 * screen and the demo doesn't open to an empty list. Safe to re-run; it clears
 * the table first.
 *
 * Requires the table to exist — run `bun run db:push` first.
 */

import { count, sql } from "drizzle-orm";
import { db } from "./db";
import { items } from "./schema";

const SAMPLE = [
  "Pitch practice run",
  "Wire up the submit flow",
  "Fix the empty state",
  "Record the demo video",
];

db.delete(items).run();
db.run(sql`DELETE FROM sqlite_sequence WHERE name = 'items'`);
db.insert(items)
  .values(SAMPLE.map(title => ({ title })))
  .run();

const [row] = db.select({ value: count() }).from(items).all();
console.log(`seeded ${row?.value ?? 0} items into ${process.env.DB_PATH ?? "data.db"}`);
