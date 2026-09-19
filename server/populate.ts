/**
 * Load `fixtures/*.json` into the real database: `bun run db:populate`.
 *
 * This is NOT the mock data and NOT the demo. `src/mocks/data.ts` is fixtures for
 * the browser, `shared/demo.ts` is the demo everybody ships with — both are
 * TypeScript and both are read by two consumers at once. The files under
 * `fixtures/` are plain JSON, read only by this script, and exist so the live
 * `data.db` can be filled with extra people and opinions without touching either.
 *
 * What it does:
 *
 * - **Additive.** The catalogue, the demo rows and any account registered while
 *   testing all survive. Nothing is wiped, so this is not `db:seed`.
 * - **Re-runnable.** A fixture user is matched by username: found, their reviews,
 *   bookmarks and outgoing follows are replaced; not found, they're inserted. Run
 *   it twice and the database looks the same as after running it once.
 * - **Validated before it writes.** Every row is checked against the same rules the
 *   API enforces — `canUse()` for the gender gate, `detailKeysFor()` for which
 *   detail ratings a washroom can even have — and a bad row aborts the whole run
 *   naming itself. A fixture that would look broken on screen never reaches SQLite.
 *
 * `position` is derived from file order within each (user, bucket) group, exactly
 * like `shared/demo.ts`: earlier line means better. No score is written anywhere —
 * it's computed from position on read (see `scoreForPosition()`).
 *
 * Requires the tables to exist (`bun run db:push`) and the catalogue to be loaded
 * (`bun run db:catalogue` or `bun run db:seed`), since reviews point at real ids.
 */

import { eq, inArray } from "drizzle-orm";
import type {
  Bucket,
  Rating,
  ReviewDetailKey,
  ReviewDetails,
  WashroomPref,
  WashroomType,
} from "../shared/api";
import { bucketForRating, canUse, detailKeysFor } from "../shared/api";
import { DEMO_PASSWORD } from "../shared/demo";
import { db } from "./db";
import { bathrooms, bookmarks, follows, reviews, users } from "./schema";

import bookmarkFixtures from "../fixtures/bookmarks.json";
import followFixtures from "../fixtures/follows.json";
import reviewFixtures from "../fixtures/reviews.json";
import userFixtures from "../fixtures/users.json";

// ─── The shapes the JSON is expected to have ──────────────────────────────────

type UserFixture = {
  username: string;
  display_name: string;
  email: string;
  washroom_pref: WashroomPref;
  avatar_color: string;
  created_at?: string;
  /** Plaintext, like every other account here. Defaults to `DEMO_PASSWORD`. */
  password?: string;
};

type ReviewFixture = {
  /** Username, not id — ids are assigned by SQLite and differ between databases. */
  user: string;
  bathroom_id: number;
  rating: Rating;
  note?: string | null;
  created_at?: string;
  /** Optional overrides; anything missing is derived from the stars. */
  details?: ReviewDetails;
};

/** `[follower username, followee username]`. Either side may be an existing user. */
type FollowFixture = [string, string];
/** `[username, bathroom_id]`. */
type BookmarkFixture = [string, number];

const USERS = userFixtures as UserFixture[];
const REVIEWS = reviewFixtures as ReviewFixture[];
const FOLLOWS = followFixtures as FollowFixture[];
const BOOKMARKS = bookmarkFixtures as BookmarkFixture[];

/**
 * A bad fixture throws rather than exits, so the transaction below rolls back and
 * a half-loaded database never survives the failure.
 */
class FixtureError extends Error {}

function fail(what: string, why: string): never {
  throw new FixtureError(`${what} — ${why}`);
}

/**
 * Detail ratings derived from the stars, the same trick `shared/demo.ts` uses: a 5★
 * review reads mostly-5s, a 1★ mostly-1s, and the ±1 wobble stops every bar being
 * the same length. A fixture's own `details` override key by key.
 */
function detailsFor(rating: Rating, type: WashroomType, overrides: ReviewDetails): ReviewDetails {
  const details: ReviewDetails = {};
  const keys = detailKeysFor(type);
  keys.forEach((key, index) => {
    const wobble = [0, 1, -1, 0, 1, -1][index] ?? 0;
    details[key] = Math.min(5, Math.max(1, rating + wobble)) as Rating;
  });
  for (const [key, value] of Object.entries(overrides) as [ReviewDetailKey, Rating][]) {
    if (!keys.includes(key)) {
      fail(`detail "${key}"`, `not asked about in a ${type} washroom — see detailKeysFor()`);
    }
    details[key] = value;
  }
  return details;
}

type Summary = {
  inserted: string[];
  refreshed: string[];
  reviews: number;
  follows: number;
  skippedFollows: string[];
  bookmarks: number;
};

/** Everything, in one transaction: a failure anywhere leaves `data.db` untouched. */
function populate(): Summary {
  return db.transaction((tx): Summary => {
    // ─── What's already in the database ─────────────────────────────────────

    const catalogue = new Map(
      tx
        .select({ id: bathrooms.id, washroom_type: bathrooms.washroom_type })
        .from(bathrooms)
        .all()
        .map(row => [row.id, row.washroom_type] as const),
    );

    if (catalogue.size === 0) {
      fail("the catalogue is empty", "run `bun run db:catalogue` first — reviews point at real ids");
    }

    const stored = tx
      .select({ id: users.id, username: users.username, washroom_pref: users.washroom_pref })
      .from(users)
      .all();

    /** username → id, for everyone already stored. Grows as fixture users insert. */
    const idByUsername = new Map(stored.map(row => [row.username, row.id] as const));
    const prefByUsername = new Map<string, WashroomPref>(
      stored.map(row => [row.username, row.washroom_pref] as const),
    );

    // ─── Users ──────────────────────────────────────────────────────────────

    const fixtureUsernames = new Set<string>();
    const insertedUsers: string[] = [];
    const refreshedUsers: string[] = [];

    for (const fixture of USERS) {
      if (fixtureUsernames.has(fixture.username)) {
        fail(`user "${fixture.username}"`, "listed twice in users.json");
      }
      fixtureUsernames.add(fixture.username);

      const values = {
        username: fixture.username,
        display_name: fixture.display_name,
        email: fixture.email.toLowerCase(),
        password: fixture.password ?? DEMO_PASSWORD,
        washroom_pref: fixture.washroom_pref,
        avatar_color: fixture.avatar_color,
        ...(fixture.created_at ? { created_at: fixture.created_at } : {}),
      };

      const existing = idByUsername.get(fixture.username);
      if (existing === undefined) {
        const row = tx.insert(users).values(values).returning({ id: users.id }).get();
        idByUsername.set(fixture.username, row.id);
        insertedUsers.push(fixture.username);
      } else {
        tx.update(users).set(values).where(eq(users.id, existing)).run();
        refreshedUsers.push(fixture.username);
      }
      prefByUsername.set(fixture.username, fixture.washroom_pref);
    }

    /** An id for a username named in the fixtures, or abort saying which. */
    const userId = (username: string, where: string): number => {
      const id = idByUsername.get(username);
      if (id === undefined) {
        fail(`${where} names "${username}"`, "no such user — add them to users.json, or fix the spelling");
      }
      return id;
    };

    const prefOf = (username: string, where: string): WashroomPref => {
      const pref = prefByUsername.get(username);
      if (pref === undefined) fail(`${where} names "${username}"`, "no such user");
      return pref;
    };

    // Replace what these users had. Only fixture users are touched — demo accounts
    // and anything registered by hand are left exactly as they were.
    const fixtureIds = [...fixtureUsernames].map(name => userId(name, "users.json"));
    tx.delete(reviews).where(inArray(reviews.user_id, fixtureIds)).run();
    tx.delete(bookmarks).where(inArray(bookmarks.user_id, fixtureIds)).run();
    tx.delete(follows).where(inArray(follows.follower_id, fixtureIds)).run();

    // ─── Reviews ────────────────────────────────────────────────────────────

    const positions = new Map<string, number>();
    const seenPairs = new Set<string>();

    const reviewRows = REVIEWS.map(fixture => {
      const where = `review by ${fixture.user} of bathroom ${fixture.bathroom_id}`;
      if (!fixtureUsernames.has(fixture.user)) {
        fail(where, "only users from users.json may be given reviews");
      }
      const id = userId(fixture.user, where);

      if (!Number.isInteger(fixture.rating) || fixture.rating < 1 || fixture.rating > 5) {
        fail(where, `rating must be 1–5, got ${fixture.rating}`);
      }

      const type = catalogue.get(fixture.bathroom_id);
      if (type === undefined) fail(where, "no such bathroom in the catalogue");

      const pref = prefOf(fixture.user, where);
      if (!canUse(pref, type)) {
        fail(where, `a "${pref}" user can't use a "${type}" washroom — the gate would reject this`);
      }

      const pair = `${id}:${fixture.bathroom_id}`;
      if (seenPairs.has(pair)) fail(where, "reviewed twice — one review per user per bathroom");
      seenPairs.add(pair);

      // Position is file order within the (user, bucket) group: earlier is better.
      const bucket: Bucket = bucketForRating(fixture.rating);
      const key = `${id}:${bucket}`;
      const position = positions.get(key) ?? 0;
      positions.set(key, position + 1);

      const details = detailsFor(fixture.rating, type, fixture.details ?? {});
      return {
        user_id: id,
        bathroom_id: fixture.bathroom_id,
        rating: fixture.rating,
        cleanliness: details.cleanliness ?? null,
        accessibility: details.accessibility ?? null,
        smell: details.smell ?? null,
        hygiene: details.hygiene ?? null,
        privacy: details.privacy ?? null,
        products: details.products ?? null,
        photos: [],
        note: fixture.note ?? null,
        bucket,
        position,
        ...(fixture.created_at ? { created_at: fixture.created_at } : {}),
      };
    });

    if (reviewRows.length > 0) tx.insert(reviews).values(reviewRows).run();

    // ─── Follows ────────────────────────────────────────────────────────────

    // Either side may be a demo account, which only exists once `db:seed` has run —
    // a missing seed rather than a broken fixture, so an unknown name is a skip with
    // a warning, not an abort. Rows in the demo → fixture direction are the point:
    // without them the new people never appear in an existing account's feed.
    const skippedFollows: string[] = [];
    const seenFollows = new Set<string>();
    const followRows = FOLLOWS.flatMap(([follower, followee]) => {
      const where = `follow ${follower} → ${followee}`;
      if (follower === followee) fail(where, "nobody follows themselves");
      if (!idByUsername.has(follower) || !idByUsername.has(followee)) {
        skippedFollows.push(where);
        return [];
      }
      const row = { follower_id: userId(follower, where), followee_id: userId(followee, where) };

      // The pair is the primary key, so a repeated line would abort the insert.
      const key = `${row.follower_id}:${row.followee_id}`;
      if (seenFollows.has(key)) return [];
      seenFollows.add(key);
      return [row];
    });

    // Only a fixture user's own follows were cleared above, so a row whose follower
    // is an existing account may already be there. Ignoring the conflict keeps the
    // script re-runnable without deleting follows it didn't write.
    if (followRows.length > 0) {
      tx.insert(follows).values(followRows).onConflictDoNothing().run();
    }

    // ─── Bookmarks ──────────────────────────────────────────────────────────

    const bookmarkRows = BOOKMARKS.map(([username, bathroom_id]) => {
      const where = `bookmark ${username} → bathroom ${bathroom_id}`;
      if (!fixtureUsernames.has(username)) {
        fail(where, "only users from users.json may be given bookmarks");
      }

      const type = catalogue.get(bathroom_id);
      if (type === undefined) fail(where, "no such bathroom in the catalogue");

      const pref = prefOf(username, where);
      if (!canUse(pref, type)) {
        fail(where, `a "${pref}" user can't save a "${type}" washroom — the gate would reject this`);
      }
      return { user_id: userId(username, where), bathroom_id };
    });

    if (bookmarkRows.length > 0) tx.insert(bookmarks).values(bookmarkRows).run();

    return {
      inserted: insertedUsers,
      refreshed: refreshedUsers,
      reviews: reviewRows.length,
      follows: followRows.length,
      skippedFollows,
      bookmarks: bookmarkRows.length,
    };
  });
}

let summary: Summary;
try {
  summary = populate();
} catch (error) {
  if (!(error instanceof FixtureError)) throw error;
  console.error(`fixtures: ${error.message}`);
  console.error("nothing was written — the transaction rolled back.");
  process.exit(1);
}

const named = (list: string[]) => (list.length ? ` (${list.join(", ")})` : "");

console.log(
  [
    `populated ${process.env.DB_PATH ?? "data.db"} from fixtures/:`,
    `${summary.inserted.length} users inserted${named(summary.inserted)}`,
    `${summary.refreshed.length} users refreshed${named(summary.refreshed)}`,
    `${summary.reviews} reviews`,
    `${summary.follows} follows`,
    `${summary.bookmarks} bookmarks`,
  ].join("\n  "),
);

if (summary.skippedFollows.length > 0) {
  console.log(
    `\nskipped ${summary.skippedFollows.length} follows naming someone not in this database` +
      " (run `bun run db:seed` for the demo accounts, or fix the username):\n  " +
      summary.skippedFollows.join("\n  "),
  );
}
