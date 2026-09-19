/**
 * The rules `server/routes.ts` has to hold, exercised over real HTTP.
 *
 * This is the server-side twin of `src/mocks/client.test.ts`. Both implementations
 * of `ApiClient` must be indistinguishable to a screen, so the list of rules is the
 * same list: the gate refuses rather than hides, the feed crosses types and flags
 * what you can't use, scores stay inside their bucket's band, inserting at the top
 * moves what was there, and re-rating replaces instead of stacking.
 *
 * ─── How this runs ───────────────────────────────────────────────────────────
 *
 * The REAL server, in a REAL subprocess, over REAL HTTP, against a THROWAWAY
 * database — never the project's `data.db`. Nothing here imports a handler
 * directly, so route wiring, methods, status codes and JSON shapes are all under
 * test rather than assumed. `beforeAll` pushes the schema with `drizzle-kit`, loads
 * `server/seed.ts`, boots `server/index.ts` on a free high port and polls until it
 * answers; `afterAll` kills it and deletes the database.
 *
 * Every URL is built from `paths` in `shared/api.ts`, so a renamed endpoint breaks
 * the client and this file in the same commit instead of drifting apart quietly.
 *
 * ─── Isolation: re-seed before every test ────────────────────────────────────
 *
 * Several tests write — they submit reviews, follow people, register accounts.
 * Rather than ordering the suite so the writes happen last (fragile: one new test
 * in the wrong place and a read starts seeing another test's review), `beforeEach`
 * re-runs `server/seed.ts` against the temp database. It clears every table and
 * reinserts the fixtures with the same ids, including `sqlite_sequence`, so each
 * test starts from the documented fixture state and the suite is order-independent.
 * It costs ~50ms a test, which at this size is cheaper than the reasoning.
 * The seed process writes on its own connection; the running server reads it
 * straight away (WAL, no caching of rows anywhere).
 */

import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BUCKET_BANDS,
  paths,
  type Bathroom,
  type BathroomDetail,
  type Bucket,
  type FeedEntry,
  type Profile,
  type RankedBathroom,
  type Rating,
  type ReviewDetails,
  type SubmitReviewResult,
  type User,
  type UserSummary,
} from "../shared/api";
import { CATALOGUE } from "../shared/catalogue";

// ─── The fixtures these assertions lean on ────────────────────────────────────
// See `shared/demo.ts`. Named rather than inlined so a failure reads as a
// sentence and a fixture change lands in one place.

/** Alex Chen, `washroom_pref: "female"` — sees female + universal. */
const ALEX = 1;
/** Jordan Kim, `washroom_pref: "male"`. */
const JORDAN = 3;
/** Sam Lee, `washroom_pref: "universal"` — sees universal ONLY. */
const SAM = 5;
/** Alex Tran, male, and deliberately NOT followed by Alex Chen. */
const ATRAN = 6;

const ALEX_EMAIL = "a24chen@uwaterloo.ca";
const DEMO_PASSWORD = "pupi";

/** Male, so outside Alex's gate. */
const MENS_ROOM = 2;
/** Female, on Alex's want-to-go list, and NOT reviewed by them. */
const UNREVIEWED_ROOM = 11;
/** Reviewed by users 1, 2 and 4 — its global score is a mean of three. */
const SHARED_ROOM = 6;

/**
 * A valid set of the optional per-aspect notes; individual tests bend one value
 * to break it. Never folded into the score — see `ReviewDetails`.
 */
const details: ReviewDetails = {
  cleanliness: 4,
  accessibility: 4,
  smell: 4,
  hygiene: 4,
  privacy: 4,
};

// ─── Harness ──────────────────────────────────────────────────────────────────

const ROOT = join(import.meta.dir, "..");
const DB_PATH = join(tmpdir(), `pupi-routes-test-${process.pid}-${Bun.randomUUIDv7()}.db`);
const CHILD_ENV = { ...process.env, DB_PATH };

let base = "";
let server: Bun.Subprocess | null = null;

/**
 * A free port, found by binding it here and letting go immediately. The child can
 * not use port 0 — we'd have to scrape its stdout to learn where it landed.
 */
function pickPort(): number {
  for (let port = 31917; port < 31967; port++) {
    try {
      const probe = Bun.serve({ port, fetch: () => new Response("") });
      probe.stop(true);
      return port;
    } catch {
      // in use — try the next one
    }
  }
  throw new Error("no free port in 31917–31966 to boot the test server on");
}

function run(cmd: string[], what: string): void {
  const result = Bun.spawnSync(cmd, {
    cwd: ROOT,
    env: CHILD_ENV,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (!result.success) {
    throw new Error(
      `${what} failed (exit ${result.exitCode})\n${result.stdout.toString()}\n${result.stderr.toString()}`,
    );
  }
}

/** Fixtures back to their documented state. See the isolation note up top. */
function reseed(): void {
  run([process.execPath, "server/seed.ts"], "seeding the test database");
}

beforeAll(async () => {
  // `--force` so a schema push never stops to ask; the database is brand new
  // anyway, so there is nothing it could destroy.
  run([process.execPath, "run", "db:push", "--force"], "pushing the schema");
  reseed();

  const port = pickPort();
  base = `http://localhost:${port}`;
  server = Bun.spawn([process.execPath, "server/index.ts"], {
    cwd: ROOT,
    env: { ...CHILD_ENV, PORT: String(port) },
    stdout: "inherit",
    stderr: "inherit",
  });

  // Poll until it answers anything at all — a 401 from `me` is a live server.
  const deadline = Date.now() + 15_000;
  for (;;) {
    if (server.exitCode !== null) {
      throw new Error(`server exited with ${server.exitCode} before answering (output above)`);
    }
    try {
      await fetch(`${base}${paths.me}`);
      return;
    } catch {
      if (Date.now() > deadline) {
        throw new Error(`server never answered on ${base} — see its output above`);
      }
      await Bun.sleep(100);
    }
  }
});

beforeEach(reseed);

afterAll(async () => {
  server?.kill();
  await server?.exited;
  for (const suffix of ["", "-wal", "-shm"]) rmSync(`${DB_PATH}${suffix}`, { force: true });
});

/**
 * One request. `user` becomes the `x-pupi-user` header — the entire auth story —
 * and a body implies JSON. Returns the status alongside the parsed payload so a
 * test can assert on both, which is the point of going over HTTP at all.
 */
async function api<T = unknown>(
  path: string,
  init: RequestInit & { user?: number } = {},
): Promise<{ status: number; body: T }> {
  const { user, headers, ...rest } = init;
  const merged = new Headers(headers);
  if (user !== undefined) merged.set("x-pupi-user", String(user));
  if (rest.body !== undefined && !merged.has("content-type")) {
    merged.set("content-type", "application/json");
  }

  const res = await fetch(`${base}${path}`, { ...rest, headers: merged });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body: body as T };
}

const post = (path: string, user: number, payload: unknown) =>
  api(path, { method: "POST", user, body: JSON.stringify(payload) });

/**
 * A request that is expected to have no route behind it, reduced to its status.
 *
 * `Bun.serve` answers a method its route doesn't declare with 405, but Bun's own
 * `fetch` intermittently stalls reading that response on a reused keep-alive
 * connection — a client quirk, not a server one (curl gets its 405 instantly).
 * So the two "this route does not exist" probes carry their own timeout, and a
 * stall reports as 0, which is still not a 2xx. That is exactly what the rule
 * asserts: no route, nothing created.
 */
async function attempt(path: string, init: RequestInit & { user?: number }): Promise<number> {
  try {
    const { status } = await api(path, { ...init, signal: AbortSignal.timeout(1_500) });
    return status;
  } catch {
    return 0;
  }
}

/** The error message off a failed response, whatever the handler threw. */
const errorOf = (body: unknown): string =>
  typeof body === "object" && body !== null && "error" in body ? String(body.error) : "";

/**
 * Stars that land a review in a given band.
 *
 * The band is **derived** from the stars by `bucketForRating()` and is never sent
 * — so the tests still say "loved" where that's the point being made, and this
 * table is the one place that knows which star rating gets them there.
 */
const STARS_FOR: Record<Bucket, Rating> = { loved: 5, fine: 3, never: 1 };

/** Submit a review as `user`. Returns the whole result so callers can assert on it. */
const review = (
  user: number,
  bathroom_id: number,
  bucket: Bucket,
  position: number,
  extra: Partial<{
    rating: Rating;
    details: ReviewDetails;
    photos: string[];
    note: string | null;
  }> = {},
) =>
  post(paths.reviews, user, {
    bathroom_id,
    rating: extra.rating ?? STARS_FOR[bucket],
    details: extra.details ?? details,
    photos: extra.photos ?? [],
    note: extra.note ?? null,
    position,
  }) as Promise<{ status: number; body: SubmitReviewResult }>;

// ─── Harness sanity ───────────────────────────────────────────────────────────

test("the harness boots the real server against a throwaway database", async () => {
  const { status, body } = await api<User>(paths.me, { user: ALEX });

  expect(status).toBe(200);
  expect(body.id).toBe(ALEX);
  expect(body.display_name).toBe("Alex Chen");
  expect(body.email).toBe(ALEX_EMAIL);
  expect(body.washroom_pref).toBe("female");
  // The one column that must never reach the wire.
  expect(body).not.toHaveProperty("password");
});

// ─── 1–3 · The gate ───────────────────────────────────────────────────────────

test("the gate refuses a washroom outside your preference, it does not quietly hide it", async () => {
  const detail = await api(paths.bathroom(MENS_ROOM), { user: ALEX });
  expect(detail.status).toBe(403);
  expect(errorOf(detail.body)).toMatch(/washroom/);

  const bookmark = await api(paths.bookmark(MENS_ROOM), { method: "PUT", user: ALEX });
  expect(bookmark.status).toBe(403);
  expect(errorOf(bookmark.body)).toMatch(/washroom/);

  const wantToGo = await api(paths.wantToGoItem(MENS_ROOM), { method: "PUT", user: ALEX });
  expect(wantToGo.status).toBe(403);
  expect(errorOf(wantToGo.body)).toMatch(/washroom/);
});

test("browse never returns a washroom outside the user's preference", async () => {
  const mine = await api<Bathroom[]>(paths.bathrooms, { user: ALEX });
  expect(mine.status).toBe(200);
  expect(mine.body.length).toBeGreaterThan(0);
  expect(mine.body.every(b => b.washroom_type !== "male")).toBe(true);
  expect(mine.body.some(b => b.washroom_type === "universal")).toBe(true);

  // `universal` is the strict case: universal ONLY, never female or male.
  const theirs = await api<Bathroom[]>(paths.bathrooms, { user: SAM });
  expect(theirs.status).toBe(200);
  expect(theirs.body.length).toBeGreaterThan(0);
  expect(theirs.body.every(b => b.washroom_type === "universal")).toBe(true);
});

test("the feed crosses types on purpose, and flags the ones you can't use", async () => {
  const { status, body: feed } = await api<FeedEntry[]>(paths.feed, { user: ALEX });
  expect(status).toBe(200);
  expect(feed.length).toBeGreaterThan(0);

  const blocked = feed.filter(entry => !entry.can_use);
  expect(blocked.length).toBeGreaterThan(0);
  expect(blocked.every(entry => entry.bathroom.washroom_type === "male")).toBe(true);

  // Every row still carries the type, which is what makes the exception safe.
  expect(feed.every(entry => typeof entry.bathroom.washroom_type === "string")).toBe(true);
});

// ─── 4–8 · Ranking ────────────────────────────────────────────────────────────

test("scores come out of rank, and stay inside their bucket's band", async () => {
  const { status, body: rankings } = await api<RankedBathroom[]>(paths.rankings, { user: ALEX });
  expect(status).toBe(200);
  expect(rankings.length).toBeGreaterThan(0);

  for (const entry of rankings) {
    const [low, high] = BUCKET_BANDS[entry.bucket];
    expect(entry.score).toBeGreaterThanOrEqual(low);
    expect(entry.score).toBeLessThanOrEqual(high);
  }

  // Ranks are dense and 1-based across every bucket, and the list is best first.
  expect(rankings.map(r => r.rank)).toEqual(rankings.map((_, i) => i + 1));
  for (let i = 1; i < rankings.length; i++) {
    expect(rankings[i]!.score).toBeLessThanOrEqual(rankings[i - 1]!.score);
  }
});

test("inserting at the top moves the bathroom that used to be there", async () => {
  const before = await api<RankedBathroom[]>(paths.rankings, { user: ALEX });
  const topBefore = before.body[0]!;
  expect(before.body.some(e => e.bathroom.id === UNREVIEWED_ROOM)).toBe(false);

  const { status, body: result } = await review(ALEX, UNREVIEWED_ROOM, "loved", 0);

  expect(status).toBe(200);
  expect(result.rank).toBe(1);
  expect(result.review.score).toBe(BUCKET_BANDS.loved[1]);
  expect(result.review.bathroom_id).toBe(UNREVIEWED_ROOM);
  expect(result.previous_score).toBeNull();

  // The whole point: the room that used to be #1 is now worth strictly less.
  const topAfter = result.rankings.find(e => e.bathroom.id === topBefore.bathroom.id)!;
  expect(topAfter.score).toBeLessThan(topBefore.score);
  expect(result.rankings).toHaveLength(before.body.length + 1);
});

test("re-rating replaces the old review instead of stacking a second one", async () => {
  const before = await api<RankedBathroom[]>(paths.rankings, { user: ALEX });
  const target = before.body[0]!;

  const { status, body: result } = await review(ALEX, target.bathroom.id, "never", 0, {
    note: "second look",
  });

  expect(status).toBe(200);
  expect(result.previous_score).toBe(target.score);
  expect(result.rankings).toHaveLength(before.body.length);
  expect(result.rankings.filter(e => e.bathroom.id === target.bathroom.id)).toHaveLength(1);
  expect(result.review.score).toBeLessThanOrEqual(BUCKET_BANDS.never[1]);
});

test("a detail rating outside 1–5, or a fractional one, is refused by name", async () => {
  for (const [key, value] of [
    ["cleanliness", 9],
    ["smell", 0],
    ["privacy", 2.5],
  ] as const) {
    const { status, body } = await review(ALEX, UNREVIEWED_ROOM, "loved", 0, {
      details: { ...details, [key]: value as Rating },
    });

    expect(status).toBe(400);
    expect(errorOf(body)).toMatch(new RegExp(key));
  }

  // And the star rating itself, which is the one that decides the band.
  for (const bad of [0, 6, 3.5]) {
    const { status, body } = await review(ALEX, UNREVIEWED_ROOM, "loved", 0, {
      rating: bad as Rating,
    });
    expect(status).toBe(400);
    expect(errorOf(body)).toMatch(/rating/);
  }

  // Nothing was written by any of those.
  const after = await api<RankedBathroom[]>(paths.rankings, { user: ALEX });
  expect(after.body.some(e => e.bathroom.id === UNREVIEWED_ROOM)).toBe(false);
});

test("an out-of-range position is clamped to the end of the bucket, not rejected", async () => {
  const { status, body: result } = await review(ALEX, UNREVIEWED_ROOM, "fine", 999);
  expect(status).toBe(200);

  const fine = result.rankings.filter(e => e.bucket === "fine");
  expect(fine.at(-1)!.bathroom.id).toBe(UNREVIEWED_ROOM);
  // Last in a bucket means the bottom of its band, by definition.
  expect(result.review.score).toBe(BUCKET_BANDS.fine[0]);
});

// ─── 9–11 · Social ────────────────────────────────────────────────────────────

test("following is instant, one-directional, and changes the feed", async () => {
  const search = await api<UserSummary[]>(paths.users("atran"), { user: ALEX });
  expect(search.status).toBe(200);
  const stranger = search.body.find(u => u.id === ATRAN)!;
  expect(stranger.following).toBe(false);

  const feedBefore = await api<FeedEntry[]>(paths.feed, { user: ALEX });
  const meBefore = await api<Profile>(paths.profile(), { user: ALEX });

  const followed = await api<UserSummary>(paths.follow(ATRAN), { method: "PUT", user: ALEX });
  expect(followed.status).toBe(200);
  expect(followed.body.following).toBe(true);

  const feedAfter = await api<FeedEntry[]>(paths.feed, { user: ALEX });
  expect(feedAfter.body.length).toBeGreaterThan(feedBefore.body.length);
  expect(feedAfter.body.some(entry => entry.user.id === ATRAN)).toBe(true);

  const theirs = await api<Profile>(paths.profile(ATRAN), { user: ALEX });
  expect(theirs.status).toBe(200);
  expect(theirs.body.followers_count).toBeGreaterThan(0);

  // One-directional: we follow one more person, nobody new follows us.
  const meAfter = await api<Profile>(paths.profile(), { user: ALEX });
  expect(meAfter.body.following_count).toBe(meBefore.body.following_count + 1);
  expect(meAfter.body.followers_count).toBe(meBefore.body.followers_count);
});

test("following yourself is refused", async () => {
  const { status, body } = await api(paths.follow(ALEX), { method: "PUT", user: ALEX });

  expect(status).toBeGreaterThanOrEqual(400);
  expect(errorOf(body)).not.toBe("");

  const me = await api<Profile>(paths.profile(), { user: ALEX });
  expect(me.body.user.following).toBe(false);
});

test("the global score is the mean of everyone's personal score, not yours", async () => {
  const { status, body: detail } = await api<BathroomDetail>(paths.bathroom(SHARED_ROOM), {
    user: ALEX,
  });

  expect(status).toBe(200);
  expect(detail.review_count).toBeGreaterThan(1);
  expect(detail.global_score).not.toBeNull();
  expect(detail.my_review).not.toBeNull();
  expect(detail.friend_reviews.length).toBeGreaterThan(0);

  // Two numbers, never conflated — if they print the same the distinction the
  // whole app is built on disappears from the demo.
  expect(detail.global_score).not.toBe(detail.my_review!.score);
});

// ─── 12–14 · Session ──────────────────────────────────────────────────────────

test("login checks the password", async () => {
  const ok = await api<User>(paths.login, {
    method: "POST",
    body: JSON.stringify({ email: ALEX_EMAIL, password: DEMO_PASSWORD }),
  });
  expect(ok.status).toBe(200);
  expect(ok.body.id).toBe(ALEX);
  expect(ok.body).not.toHaveProperty("password");

  const wrong = await api(paths.login, {
    method: "POST",
    body: JSON.stringify({ email: ALEX_EMAIL, password: "not-the-password" }),
  });
  expect(wrong.status).toBe(401);
  expect(errorOf(wrong.body)).not.toBe("");

  const unknown = await api(paths.login, {
    method: "POST",
    body: JSON.stringify({ email: "nobody@uwaterloo.ca", password: DEMO_PASSWORD }),
  });
  expect(unknown.status).toBe(401);
});

test("register refuses a duplicate username or email, and never returns the password", async () => {
  const fresh = await api<User>(paths.register, {
    method: "POST",
    body: JSON.stringify({
      username: "newcomer",
      display_name: "New Comer",
      email: "n1ewcomer@uwaterloo.ca",
      password: "hunter2",
      washroom_pref: "universal",
    }),
  });
  expect(fresh.status).toBe(200);
  expect(fresh.body.username).toBe("newcomer");
  expect(fresh.body).not.toHaveProperty("password");

  const dupeUsername = await api(paths.register, {
    method: "POST",
    body: JSON.stringify({
      username: "flushmaster99",
      display_name: "Impostor",
      email: "impostor@uwaterloo.ca",
      password: "hunter2",
      washroom_pref: "female",
    }),
  });
  expect(dupeUsername.status).toBeGreaterThanOrEqual(400);
  expect(errorOf(dupeUsername.body)).not.toBe("");

  const dupeEmail = await api(paths.register, {
    method: "POST",
    body: JSON.stringify({
      username: "impostor",
      display_name: "Impostor",
      email: ALEX_EMAIL,
      password: "hunter2",
      washroom_pref: "female",
    }),
  });
  expect(dupeEmail.status).toBeGreaterThanOrEqual(400);
  expect(errorOf(dupeEmail.body)).not.toBe("");
});

test("an unauthenticated or unknown user gets 401, never data", async () => {
  const anonymous = await api(paths.rankings);
  expect(anonymous.status).toBe(401);
  expect(errorOf(anonymous.body)).not.toBe("");

  // A stale id from a reseeded database is the realistic case, and it must 401
  // rather than 404 — `src/api.ts` turns a 401 into a clean sign-out.
  const ghost = await api(paths.rankings, { user: 9999 });
  expect(ghost.status).toBe(401);

  const garbage = await api(paths.rankings, { headers: { "x-pupi-user": "not-a-number" } });
  expect(garbage.status).toBe(401);
});

// ─── 15–16 · The catalogue, and the two saved lists ───────────────────────────

test("the catalogue is fixed — no route creates a washroom", async () => {
  /** Every washroom id the API will serve, across both halves of the gate. */
  const servedIds = async (): Promise<number[]> => {
    const mine = await api<Bathroom[]>(paths.bathrooms, { user: ALEX });
    const theirs = await api<Bathroom[]>(paths.bathrooms, { user: JORDAN });
    return [...new Set([...mine.body, ...theirs.body].map(b => b.id))].sort((a, b) => a - b);
  };

  const before = await servedIds();

  // Neither of these may answer 2xx — there is no handler behind them, and
  // there is no create-bathroom operation in the contract to write one.
  expect(await attempt(paths.bathrooms, { method: "POST", user: ALEX })).not.toBeWithin(200, 300);
  expect(await attempt(paths.bathroom(99), { method: "PUT", user: ALEX })).not.toBeWithin(200, 300);

  // Nothing appeared, nothing vanished, and every id still comes from
  // `shared/catalogue.yaml`. A female user and a male user between them see the
  // whole catalogue exactly once — female + male + universal, no leftovers.
  const after = await servedIds();
  expect(after).toEqual(before);
  expect(after.every(id => CATALOGUE.some(row => row.id === id))).toBe(true);
  expect(after).toHaveLength(CATALOGUE.length);
});

test("want-to-go drops a bathroom once it has been reviewed; a bookmark does not", async () => {
  const before = await api<Bathroom[]>(paths.wantToGo, { user: ALEX });
  expect(before.status).toBe(200);
  expect(before.body.some(b => b.id === UNREVIEWED_ROOM)).toBe(true);

  const bookmarked = await api(paths.bookmark(UNREVIEWED_ROOM), { method: "PUT", user: ALEX });
  expect(bookmarked.status).toBe(200);

  const submitted = await review(ALEX, UNREVIEWED_ROOM, "fine", 0);
  expect(submitted.status).toBe(200);

  const after = await api<Bathroom[]>(paths.wantToGo, { user: ALEX });
  expect(after.body.some(b => b.id === UNREVIEWED_ROOM)).toBe(false);

  // The intent is spent; the bookmark is a different thing and stays saved.
  const saved = await api<Bathroom[]>(paths.bookmarks, { user: ALEX });
  expect(saved.body.some(b => b.id === UNREVIEWED_ROOM)).toBe(true);
});
