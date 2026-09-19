/**
 * The schema — single source of truth for what's in `data.db`.
 *
 * Edit this file, then `bun run db:push` to apply it. No migration files, and
 * existing rows survive.
 *
 * `mode: "boolean"` is doing real work: SQLite has no boolean type, so `done` is
 * stored as 0/1 but read and written as a real boolean. That's why there's no
 * row-to-Item mapper anywhere in the backend.
 */

import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  created_at: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
