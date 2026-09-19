/**
 * Database connection. Backend territory — the frontend never imports this.
 *
 * `bun:sqlite` provides the driver; Drizzle wraps it for typed queries. Both are
 * synchronous, so handlers use `.all()` / `.get()` / `.run()` and never await.
 *
 * The schema lives in `schema.ts` and is applied with `bun run db:push` — it is
 * NOT created here, so a fresh clone must push before the first request.
 */

import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

const sqlite = new Database(process.env.DB_PATH ?? "data.db", { create: true });

// WAL lets reads and writes overlap instead of blocking each other.
sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA foreign_keys = ON");

export const db = drizzle({ client: sqlite, schema });
