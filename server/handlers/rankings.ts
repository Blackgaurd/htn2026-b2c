/**
 * Ranking: the user's ordered list, and the write that produces it.
 *
 * `submitReview` is the core mechanic. The duel already happened on the client
 * (`src/lib/duel.ts`); all that arrives here is the final 0-based `position`
 * within the bucket. The server splices the review in there, renumbers the bucket,
 * and returns the **whole recomputed list**, because inserting above an existing
 * review moves that review's score.
 *
 * Nothing stores a score. Mirrors `src/mocks/client.ts:305-367`.
 *
 * The order of operations is load-bearing:
 *
 *   gate → validate → read `previous_score` → delete → insert → renumber → rank
 *
 * The gate refuses before anything is written; `previous_score` is read *before*
 * the delete, or re-rating always reports `null`; and the renumber happens after
 * the insert so the new row is spliced into the same list it will be ranked from.
 */

import { and, eq } from "drizzle-orm";
import {
  bucketForRating,
  detailKeysFor,
  MAX_REVIEW_PHOTOS,
  type Rating,
  type RankedBathroom,
  type ReviewDetailKey,
  type ReviewDetails,
  type SubmitReviewBody,
  type SubmitReviewResult,
  type WashroomType,
} from "../../shared/api";
import { db } from "../db";
import {
  aggregates,
  assertUsable,
  bathroomRow,
  bookmarkedIds,
  HttpError,
  now,
  rankingsFor,
  readBody,
  requireUser,
  scoredReviews,
  withScore,
} from "../lib";
import { store } from "../photos";
import { reviews } from "../schema";

/**
 * The six detail columns, in table order. Every one is written on every insert
 * (as a `Rating` when answered and applicable, `null` otherwise) so a re-rate
 * can never leave a stale value behind from the review it replaced.
 */
const DETAIL_COLUMNS: readonly ReviewDetailKey[] = [
  "cleanliness",
  "accessibility",
  "smell",
  "hygiene",
  "privacy",
  "products",
] as const;

/**
 * Everything this user has reviewed, best first.
 *
 * Deliberately *not* gender-filtered: you reviewed it, so you see it. A
 * preference changed after the fact must not silently delete your own history.
 * `rankingsFor()` does the work; score falls out of each review's index within
 * its bucket, so this endpoint reads nothing it doesn't recompute.
 */
export function listMyRankings(req: Request): RankedBathroom[] {
  const user = requireUser(req);
  return rankingsFor(user.id, aggregates(), bookmarkedIds(user.id));
}

/**
 * Record a review and place it in the user's list.
 *
 * Returns the whole recomputed ranking, not just the new row: inserting at the
 * top pushes everything below it down a slot, and every one of those scores
 * changed. The client replaces its list wholesale rather than patching one entry.
 */
export async function submitReview(req: Request): Promise<SubmitReviewResult> {
  const user = requireUser(req);
  const body = await readBody<SubmitReviewBody>(req);

  // 1. The gate refuses before a single row is written.
  const room = bathroomRow(bathroomIdOf(body));
  assertUsable(user, room);

  // 2. Stars, then everything that follows from them. Same messages the mock
  //    throws, so a screen can't tell which client rejected it.
  const rating = validRating(body.rating);

  //    The band is DERIVED, never sent, so the stars and the bucket cannot
  //    disagree about the same review.
  const bucket = bucketForRating(rating);

  //    Details are optional, never touch the score, and are dropped when they
  //    don't apply to this washroom: storing a `products` rating for a men's
  //    room is a rating of something that was never there.
  const details = validDetails(body.details, room.washroom_type);

  // 3. Read the old score BEFORE deleting: after the delete it is always null.
  const before = scoredReviews(user.id).find(r => r.review.bathroom_id === room.id);
  const previous_score = before?.score ?? null;

  // 4. Re-rating replaces the old review outright rather than stacking a second
  //    one. The UNIQUE on (user_id, bathroom_id) says the same thing in SQLite.
  db.delete(reviews)
    .where(and(eq(reviews.user_id, user.id), eq(reviews.bathroom_id, room.id)))
    .run();

  // 5. Insert. `position` here is a placeholder; step 6 is what decides it.
  const created = db
    .insert(reviews)
    .values({
      user_id: user.id,
      bathroom_id: room.id,
      rating,
      ...details,
      photos: validPhotos(body.photos),
      note: trimmed(body.note),
      bucket,
      position: 0,
      created_at: now(),
    })
    .returning()
    .get();

  // 6. Splice it in at the duel's answer, then renumber the bucket so positions
  //    stay a contiguous 0..n-1: the order is the data, the numbers just record
  //    it. An out-of-range position is pinned to an end, never rejected: the
  //    duel is the only thing that produces one and a stale list shouldn't fail
  //    the write. Only the target bucket moves; a gap left in the old one heals
  //    itself, because `rankReviews()` scores by index, not by stored position.
  const bucketRows = db
    .select()
    .from(reviews)
    .where(and(eq(reviews.user_id, user.id), eq(reviews.bucket, bucket)))
    .all()
    .filter(row => row.id !== created.id)
    .sort((a, b) => a.position - b.position || a.id - b.id);

  const wanted = Number.isFinite(body.position) ? Math.trunc(body.position) : 0;
  const at = Math.min(Math.max(wanted, 0), bucketRows.length);
  bucketRows.splice(at, 0, created);

  bucketRows.forEach((row, index) => {
    if (row.position === index) return;
    row.position = index;
    db.update(reviews).set({ position: index }).where(eq(reviews.id, row.id)).run();
  });

  // 7. Rank the whole list again and report where this one landed. `rank` is
  //    1-based across every bucket, not within one.
  const rankings = rankingsFor(user.id, aggregates(), bookmarkedIds(user.id));
  const landed = rankings.find(entry => entry.review_id === created.id);
  if (!landed) throw new HttpError(500, "review vanished after insert");

  return {
    review: withScore(created, landed.score),
    rank: landed.rank,
    previous_score,
    rankings,
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

/** A non-numeric id is a missing row, same as a `:id` segment that isn't one. */
function bathroomIdOf(body: SubmitReviewBody): number {
  const id = Number(body?.bathroom_id);
  if (!Number.isInteger(id)) throw new HttpError(404, `no bathroom ${body?.bathroom_id}`);
  return id;
}

/** The one number the user actually types. Everything else follows from it. */
function validRating(rating: unknown): Rating {
  if (!Number.isInteger(rating) || (rating as number) < 1 || (rating as number) > 5) {
    throw new HttpError(400, "rating must be a whole number from 1 to 5");
  }
  return rating as Rating;
}

/**
 * The optional per-aspect notes, as the six nullable columns.
 *
 * Every key is optional, a half-filled set is fine, and an unanswered aspect is
 * `null`, not a zero. A key that doesn't apply to this washroom is dropped rather
 * than stored: `detailKeysFor()` says `products` is women's washrooms only, so
 * rating it anywhere else would be recording an opinion of something that was
 * never in the room.
 */
function validDetails(
  details: ReviewDetails | undefined,
  type: WashroomType,
): Record<ReviewDetailKey, Rating | null> {
  const allowed = new Set(detailKeysFor(type));
  const out = {} as Record<ReviewDetailKey, Rating | null>;

  for (const key of DETAIL_COLUMNS) {
    const value = details?.[key];
    if (!allowed.has(key) || value === undefined || value === null) {
      out[key] = null;
      continue;
    }
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new HttpError(400, `${key} must be a whole number from 1 to 5`);
    }
    out[key] = value;
  }
  return out;
}

/**
 * Photos in, reference URLs out.
 *
 * The bytes go to the in-process store in `server/photos.ts`; the row keeps a
 * short `/api/photos/<id>`. Extras past the cap are dropped rather than refused:
 * the client already enforces `MAX_REVIEW_PHOTOS`, so an over-long list is a
 * stale screen, not something worth failing a review over.
 */
function validPhotos(photos: string[] | undefined): string[] {
  if (photos === undefined || photos === null) return [];
  if (!Array.isArray(photos)) throw new HttpError(400, "photos must be a list");

  try {
    return photos.slice(0, MAX_REVIEW_PHOTOS).map(store);
  } catch (err) {
    throw new HttpError(400, err instanceof Error ? err.message : "that photo didn't work");
  }
}

/** A note of nothing but whitespace is no note at all. */
function trimmed(note: string | null | undefined): string | null {
  return typeof note === "string" && note.trim() ? note.trim() : null;
}
