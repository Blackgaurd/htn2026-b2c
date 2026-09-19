/**
 * The schema, single source of truth for what's in `data.db`.
 *
 * Edit this file, then `bun run db:push` to apply it. No migration files, and
 * existing rows survive.
 *
 * Two things here are load-bearing and easy to undo by accident:
 *
 * - **There is no `score` column.** A score is derived from `position` on every
 *   read via `scoreForPosition()`. Storing one means it rots the moment somebody
 *   inserts a review above it. See the ranking note in CLAUDE.md.
 * - The `enum` option on a text column is what makes `InferSelectModel` produce
 *   the literal union (`"female" | "male" | "universal"`) instead of bare
 *   `string`. Drop it and the guards in `contract.ts` stop guarding anything.
 *
 * `mode: "boolean"` does the same kind of work: SQLite has no boolean type, so
 * `accessible` is stored as 0/1 but read and written as a real boolean. That's why
 * there's no row-to-contract mapper anywhere in the backend.
 */

import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import type { Rating } from "../shared/api";

const created_at = text("created_at")
  .notNull()
  .default(sql`(datetime('now'))`);

/**
 * The fixed catalogue. Rows arrive from `shared/catalogue.yaml` via
 * `bun run db:catalogue` and from nowhere else: no handler inserts here.
 */
export const bathrooms = sqliteTable("bathrooms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  building: text("building", { enum: ["E5", "E7"] }).notNull(),
  floor: integer("floor").notNull(),
  /** Detail only, `fullLocation()` composes the building/floor prefix for display. */
  location: text("location").notNull(),
  washroom_type: text("washroom_type", { enum: ["female", "male", "universal"] }).notNull(),
  /** Has an accessible stall. A property of the room, not a room of its own. */
  accessible: integer("accessible", { mode: "boolean" }).notNull().default(false),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  display_name: text("display_name").notNull(),
  /** Stored lowercased, so login can match without a collation. */
  email: text("email").notNull().unique(),
  /**
   * Plaintext, on purpose: no tokens and no hashing worth the name (CLAUDE.md).
   * It is the one column that must never reach the wire: `publicUser()` in
   * `server/lib.ts` strips it, and `User` in the contract has no such field.
   */
  password: text("password").notNull(),
  /**
   * Free text about themselves, null until they write one. Nullable rather than
   * `.default("")` because the contract's `bio` is `string | null` and the
   * profile screen branches on null to show its placeholder, so `updateProfile`
   * stores null for a blank, and an empty string never reaches this column.
   */
  bio: text("bio"),
  washroom_pref: text("washroom_pref", { enum: ["female", "male", "universal"] }).notNull(),
  /** Hex, assigned at register. Drives the avatar chip everywhere. */
  avatar_color: text("avatar_color").notNull(),
  created_at,
});

export const reviews = sqliteTable(
  "reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    user_id: integer("user_id")
      .notNull()
      .references(() => users.id),
    bathroom_id: integer("bathroom_id")
      .notNull()
      .references(() => bathrooms.id),
    /**
     * 1–5 stars, the only input that decides which band the score comes from.
     * `bucket` below is derived from it by `bucketForRating()`, never sent
     * separately, so the two can't disagree.
     */
    rating: integer("rating").$type<Rating>().notNull(),

    /**
     * Optional per-aspect notes, null when not answered. **Never folded into the
     * score**: a bathroom's score is relative, so averaging these in would be two
     * scoring systems arguing. `products` is women's washrooms only, see
     * `detailKeysFor()`, and stays null everywhere else.
     */
    cleanliness: integer("cleanliness").$type<Rating>(),
    accessibility: integer("accessibility").$type<Rating>(),
    smell: integer("smell").$type<Rating>(),
    hygiene: integer("hygiene").$type<Rating>(),
    privacy: integer("privacy").$type<Rating>(),
    products: integer("products").$type<Rating>(),

    /** Data URLs, newest last, capped at `MAX_REVIEW_PHOTOS`. JSON in one column. */
    photos: text("photos", { mode: "json" }).$type<string[]>().notNull().default([]),

    note: text("note"),
    /** Derived from `rating`; stored so a band change is queryable. */
    bucket: text("bucket", { enum: ["loved", "fine", "never"] }).notNull(),
    /** 0-based, best-first, within this user's bucket. The thing rank is made of. */
    position: integer("position").notNull(),
    created_at,
  },
  t => [
    // Re-rating replaces the old review outright. This is the rule in the
    // database rather than only in the handler.
    unique("reviews_one_per_user_bathroom").on(t.user_id, t.bathroom_id),
  ],
);

/** One-directional: following is not mutual, and there is no pending state. */
export const follows = sqliteTable(
  "follows",
  {
    follower_id: integer("follower_id")
      .notNull()
      .references(() => users.id),
    followee_id: integer("followee_id")
      .notNull()
      .references(() => users.id),
    created_at,
  },
  t => [primaryKey({ columns: [t.follower_id, t.followee_id] })],
);

/** "Saved", lives on the profile. Different from want_to_go; keep them separate. */
export const bookmarks = sqliteTable(
  "bookmarks",
  {
    user_id: integer("user_id")
      .notNull()
      .references(() => users.id),
    bathroom_id: integer("bathroom_id")
      .notNull()
      .references(() => bathrooms.id),
    created_at,
  },
  t => [primaryKey({ columns: [t.user_id, t.bathroom_id] })],
);

/** "I intend to review this", lives on My list, and drops off once reviewed. */
export const want_to_go = sqliteTable(
  "want_to_go",
  {
    user_id: integer("user_id")
      .notNull()
      .references(() => users.id),
    bathroom_id: integer("bathroom_id")
      .notNull()
      .references(() => bathrooms.id),
    created_at,
  },
  t => [primaryKey({ columns: [t.user_id, t.bathroom_id] })],
);
