import { defineConfig } from "drizzle-kit";

/**
 * Config for the `drizzle-kit` CLI (`bun run db:push`, `bun run db:studio`).
 * Not imported by the app — `server/db.ts` opens its own connection.
 *
 * No `out` directory: we push the schema straight to the database rather than
 * generating migration files.
 */
export default defineConfig({
  dialect: "sqlite",
  schema: "./server/schema.ts",
  dbCredentials: { url: process.env.DB_PATH ?? "data.db" },
});
