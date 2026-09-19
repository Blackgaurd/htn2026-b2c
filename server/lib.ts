/**
 * The pieces every handler shares: request plumbing, the gender gate, and the
 * ranking engine.
 *
 * This file exists so the two rules that must never disagree with the frontend
 * live in exactly one place on this side:
 *
 *   1. Score is computed from `position` on read, via `scoreForPosition()` from
 *      the contract. There is no score column and nothing caches one.
 *   2. `visibleTypes(pref)` gates every read and write — except `GET /api/feed`
 *      and `Profile.top`, which cross types deliberately and flag what you can't
 *      use. Rejecting is the server's job, not the screen's.
 *
 * The behaviour mirrors `src/mocks/client.ts` closely enough that the two clients
 * are indistinguishable to a component, error strings included — that's the whole
 * point of `?mock=0` being evidence rather than just a different-looking app.
 *
 * Queries stay synchronous (`.all()` / `.get()` / `.run()`), so handlers are
 * ordinary functions and `route()` is the only thing that awaits.
 */

import type { BunRequest } from "bun";
import type { InferSelectModel } from "drizzle-orm";
import { and, eq } from "drizzle-orm";
import {
  BUCKET_ORDER,
  canUse,
  round1,
  scoreForPosition,
  type Bathroom,
  type BathroomRow,
  type RankedBathroom,
  type Review,
  type ReviewRow,
  type User,
  type UserSummary,
} from "../shared/api";
import { db } from "./db";
import { bathrooms, follows, reviews, users } from "./schema";

export type UserRow = InferSelectModel<typeof users>;

// ─── Request plumbing ─────────────────────────────────────────────────────────

/** An error that knows its status. Anything else thrown becomes a 400. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Turn a data-returning function into a Bun route handler.
 *
 * Handlers return the payload and throw on failure, which keeps them reading like
 * the mock client. Every failure lands as `{ error }` — the shape `src/api.ts`
 * relies on to surface a message to the UI.
 *
 * The two kinds of failure are not the same thing and must not be served the
 * same way:
 *
 * - An `HttpError` is a **refusal**: the request was understood and declined, and
 *   its message was written to be read by a person ("that washroom isn't one you
 *   use"). It goes out verbatim at its own status.
 * - Anything else is a **breakage** — a bug, or SQLite having a bad day. Its
 *   message was written for us, not for the user. Shipping one to the browser
 *   put `disk I/O error` in the login form's validation box, where it reads as
 *   "you typed something wrong"; and sending it as a 400 blamed the client for a
 *   server fault. So: log the real error where we'll see it, tell the user
 *   something honest and useless to an attacker, and use a 5xx.
 */
export function route<P extends string>(fn: (req: BunRequest<P>) => unknown) {
  return async (req: BunRequest<P>): Promise<Response> => {
    try {
      return Response.json(await fn(req));
    } catch (err) {
      if (err instanceof HttpError) {
        return Response.json({ error: err.message }, { status: err.status });
      }
      console.error(`${req.method} ${new URL(req.url).pathname} —`, err);
      return Response.json({ error: "something went wrong on our end" }, { status: 500 });
    }
  };
}

/** Parse a `:id` path segment, or 404 — a non-numeric id is a missing row. */
export function numericParam(raw: string | undefined, what: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id)) throw new HttpError(404, `no ${what} ${raw}`);
  return id;
}

export async function readBody<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "expected a JSON body");
  }
}

/**
 * Who's asking. The whole auth story: an id in the `x-pupi-user` header, no token
 * and no session table (CLAUDE.md). A stale id from a reseeded database 401s, and
 * `src/api.ts` turns that into a clean sign-out rather than a wedged app.
 */
export function requireUser(req: Request): UserRow {
  const header = req.headers.get("x-pupi-user");
  if (!header) throw new HttpError(401, "not signed in");
  const id = Number(header);
  if (!Number.isInteger(id)) throw new HttpError(401, "not signed in");
  const row = db.select().from(users).where(eq(users.id, id)).get();
  if (!row) throw new HttpError(401, "not signed in");
  return row;
}

/** The one column that must never reach the wire. */
export function publicUser(row: UserRow): User {
  const { password: _password, ...rest } = row;
  return rest;
}

export function userRow(id: number): UserRow {
  const row = db.select().from(users).where(eq(users.id, id)).get();
  if (!row) throw new HttpError(404, `no user ${id}`);
  return row;
}

export function bathroomRow(id: number): BathroomRow {
  const row = db.select().from(bathrooms).where(eq(bathrooms.id, id)).get();
  if (!row) throw new HttpError(404, `no bathroom ${id}`);
  return row;
}

/** SQLite's `datetime('now')` format — UTC, "YYYY-MM-DD HH:MM:SS". */
export const now = (): string => new Date().toISOString().slice(0, 19).replace("T", " ");

// ─── The gate ─────────────────────────────────────────────────────────────────

/**
 * The gate refuses; it does not quietly return nothing. Same message the mock
 * throws, so a screen can't tell which client rejected it.
 */
export function assertUsable(user: UserRow, row: BathroomRow): void {
  if (!canUse(user.washroom_pref, row.washroom_type)) {
    throw new HttpError(403, "that washroom isn't one you use");
  }
}

/** Catalogue order, used by every list: building, then floor, then id. */
export const byLocation = (a: BathroomRow, b: BathroomRow): number =>
  a.building.localeCompare(b.building) || a.floor - b.floor || a.id - b.id;

// ─── The ranking engine ───────────────────────────────────────────────────────

export type ScoredReview = { review: ReviewRow; score: number; rank: number };

/**
 * One user's reviews, scored and ranked.
 *
 * The score comes from each review's **index within its bucket**, not from the
 * stored `position` — so a gap or a duplicate left behind by an earlier write
 * heals itself instead of producing a score outside the band. `position` only has
 * to describe the order; the order is the data.
 *
 * `rank` is 1-based and dense across all three buckets, in `BUCKET_ORDER`.
 */
export function rankReviews(rows: ReviewRow[]): ScoredReview[] {
  const out: ScoredReview[] = [];

  for (const bucket of BUCKET_ORDER) {
    const inBucket = rows
      .filter(r => r.bucket === bucket)
      .sort((a, b) => a.position - b.position || a.id - b.id);

    inBucket.forEach((review, index) => {
      out.push({ review, score: scoreForPosition(bucket, index, inBucket.length), rank: 0 });
    });
  }

  out.forEach((row, index) => {
    row.rank = index + 1;
  });
  return out;
}

export function reviewRowsFor(userId: number): ReviewRow[] {
  return db.select().from(reviews).where(eq(reviews.user_id, userId)).all();
}

export function scoredReviews(userId: number): ScoredReview[] {
  return rankReviews(reviewRowsFor(userId));
}

export const withScore = (review: ReviewRow, score: number): Review => ({ ...review, score });

// ─── Aggregates ───────────────────────────────────────────────────────────────

export type Aggregate = { global_score: number; review_count: number };

/**
 * The global score: the mean of every user's *personal* score for a bathroom —
 * never the mean of their star ratings, and never filtered by the viewer's gate.
 *
 * Computed in JS rather than SQL because a rank-derived score can't be averaged
 * without replaying each user's ranking first. Every review in the database, once
 * per call; at demo scale that's cheaper than being clever about it.
 */
export function aggregates(): Map<number, Aggregate> {
  const byUser = new Map<number, ReviewRow[]>();
  for (const row of db.select().from(reviews).all()) {
    const list = byUser.get(row.user_id);
    if (list) list.push(row);
    else byUser.set(row.user_id, [row]);
  }

  const totals = new Map<number, { sum: number; count: number }>();
  for (const rows of byUser.values()) {
    for (const { review, score } of rankReviews(rows)) {
      const entry = totals.get(review.bathroom_id) ?? { sum: 0, count: 0 };
      entry.sum += score;
      entry.count += 1;
      totals.set(review.bathroom_id, entry);
    }
  }

  const out = new Map<number, Aggregate>();
  for (const [bathroom_id, { sum, count }] of totals) {
    out.set(bathroom_id, { global_score: round1(sum / count), review_count: count });
  }
  return out;
}

/** The stored row plus the aggregates every list needs. `null` until reviewed. */
export function toBathroom(row: BathroomRow, agg: Map<number, Aggregate>): Bathroom {
  const found = agg.get(row.id);
  return {
    ...row,
    global_score: found?.global_score ?? null,
    review_count: found?.review_count ?? 0,
  };
}

export function bathroomsById(): Map<number, BathroomRow> {
  return new Map(db.select().from(bathrooms).all().map(row => [row.id, row]));
}

/** A user's full ranked list, best first. Not gender-filtered: you reviewed it. */
export function rankingsFor(userId: number, agg = aggregates()): RankedBathroom[] {
  const rooms = bathroomsById();
  return scoredReviews(userId).flatMap(({ review, score, rank }) => {
    const room = rooms.get(review.bathroom_id);
    if (!room) return []; // catalogue row retired out from under a review
    return [
      {
        bathroom: toBathroom(room, agg),
        review_id: review.id,
        score,
        rank,
        bucket: review.bucket,
        position: review.position,
        rating: review.rating,
      },
    ];
  });
}

// ─── Social ───────────────────────────────────────────────────────────────────

/** Another user as the viewer sees them. `following` is false for yourself. */
export function summarize(target: UserRow, viewerId: number): UserSummary {
  const edge =
    target.id === viewerId
      ? undefined
      : db
          .select()
          .from(follows)
          .where(and(eq(follows.follower_id, viewerId), eq(follows.followee_id, target.id)))
          .get();

  return {
    id: target.id,
    username: target.username,
    display_name: target.display_name,
    avatar_color: target.avatar_color,
    washroom_pref: target.washroom_pref,
    following: edge !== undefined,
  };
}

/** Who this user follows, in the order the edges were created. */
export function followeeIds(userId: number): number[] {
  return db
    .select({ id: follows.followee_id })
    .from(follows)
    .where(eq(follows.follower_id, userId))
    .all()
    .map(r => r.id);
}
