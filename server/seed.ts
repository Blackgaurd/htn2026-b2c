/**
 * Puts sample rows in the local database: `bun run db:seed`.
 *
 * Real data in real SQLite — just pre-made, so a fresh clone has something on
 * screen and the demo doesn't open to an empty list. Safe to re-run; it clears
 * the table first.
 */

import { db } from "./db";

const SAMPLE = [
  "Pitch practice run",
  "Wire up the submit flow",
  "Fix the empty state",
  "Record the demo video",
];

db.exec("DELETE FROM items");
db.exec("DELETE FROM sqlite_sequence WHERE name = 'items'");

const insert = db.query<unknown, [string]>("INSERT INTO items (title) VALUES (?)");
const seedAll = db.transaction((titles: string[]) => {
  for (const title of titles) insert.run(title);
});
seedAll(SAMPLE);

const { count } = db.query<{ count: number }, []>("SELECT COUNT(*) AS count FROM items").get()!;
console.log(`seeded ${count} items into ${process.env.DB_PATH ?? "data.db"}`);
