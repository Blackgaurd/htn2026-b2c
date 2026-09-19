/**
 * Load the demo into the local database: `bun run db:seed`.
 *
 * Real data in real SQLite — just pre-made, so a fresh clone has something on
 * screen and the demo doesn't open to an empty list. Safe to re-run; it clears
 * every table first and reinserts with the **same ids the mocks use**, which is
 * what makes `?mock=0` evidence the backend works rather than just a
 * different-looking app: same people, same feed, same global scores.
 *
 * Wipes everything, including any account you registered while testing. To apply
 * a catalogue edit without losing that, use `bun run db:catalogue` instead — it
 * upserts washrooms and leaves users and reviews alone.
 *
 * Every row comes from `shared/`, never from here: `shared/catalogue.yaml` via
 * `CATALOGUE`, and the people, reviews, follows, bookmarks and want-to-go from
 * `shared/demo.ts`. `src/mocks/data.ts` reads those same constants.
 *
 * Requires the tables to exist — run `bun run db:push` first.
 */

import { count, sql } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { CATALOGUE } from "../shared/catalogue";
import {
  DEMO_BOOKMARKS,
  DEMO_FOLLOWS,
  DEMO_USERS,
  DEMO_WANT_TO_GO,
  demoReviews,
} from "../shared/demo";
import { db } from "./db";
import { bathrooms, bookmarks, follows, reviews, users, want_to_go } from "./schema";

// Children before parents: `PRAGMA foreign_keys = ON` is set in db.ts.
db.delete(want_to_go).run();
db.delete(bookmarks).run();
db.delete(follows).run();
db.delete(reviews).run();
db.delete(users).run();
db.delete(bathrooms).run();
db.run(sql`DELETE FROM sqlite_sequence WHERE name IN ('bathrooms', 'users', 'reviews')`);

db.insert(bathrooms).values([...CATALOGUE]).run();
db.insert(users).values([...DEMO_USERS]).run();
db.insert(reviews).values(demoReviews()).run();

db.insert(follows)
  .values(DEMO_FOLLOWS.map(([follower_id, followee_id]) => ({ follower_id, followee_id })))
  .run();
db.insert(bookmarks)
  .values(DEMO_BOOKMARKS.map(([user_id, bathroom_id]) => ({ user_id, bathroom_id })))
  .run();
db.insert(want_to_go)
  .values(DEMO_WANT_TO_GO.map(([user_id, bathroom_id]) => ({ user_id, bathroom_id })))
  .run();

const tally = (table: SQLiteTable): number =>
  db.select({ value: count() }).from(table).all()[0]?.value ?? 0;

console.log(
  [
    `seeded into ${process.env.DB_PATH ?? "data.db"}:`,
    `${tally(bathrooms)} washrooms`,
    `${tally(users)} users`,
    `${tally(reviews)} reviews`,
    `${tally(follows)} follows`,
    `${tally(bookmarks)} bookmarks`,
    `${tally(want_to_go)} want-to-go`,
  ].join("\n  "),
);
