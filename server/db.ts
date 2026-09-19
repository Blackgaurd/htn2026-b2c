/**
 * SQLite connection + schema. Backend territory — the frontend never imports this.
 *
 * `bun:sqlite` is synchronous: no await, no connection pool, no ORM.
 */

import { Database } from "bun:sqlite";

const DB_PATH = process.env.DB_PATH ?? "data.db";

export const db = new Database(DB_PATH, { create: true });

// WAL lets reads and writes overlap instead of blocking each other.
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT    NOT NULL,
    done       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

/**
 * SQLite has no boolean type — `done` comes back as 0 or 1. Every query below
 * selects into this shape, and `toItem` in routes.ts converts it to the
 * `Item` the contract promises.
 */
export type ItemRow = {
  id: number;
  title: string;
  done: number;
  created_at: string;
};
