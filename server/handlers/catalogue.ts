/**
 * The catalogue: browse and detail.
 *
 * There is no create-bathroom handler here and there never will be, rows arrive
 * from `shared/catalogue.yaml` via `bun run db:catalogue` and nowhere else.
 *
 * Both endpoints are gated: `listBathrooms` filters to `visibleTypes(pref)`, and
 * `getBathroom` *refuses* a washroom outside it rather than returning a stripped
 * version. Mirrors `src/mocks/client.ts:261-301`.
 */

import { and, eq } from "drizzle-orm";
import { canUse, type Bathroom, type BathroomDetail, type FriendReview } from "../../shared/api";
import { db } from "../db";
import {
  aggregates,
  assertUsable,
  bathroomRow,
  bathroomsById,
  bookmarkedIds,
  byLocation,
  followeeIds,
  numericParam,
  requireUser,
  scoredReviews,
  summarize,
  toBathroom,
  userRow,
  withScore,
} from "../lib";
import { bookmarks, want_to_go } from "../schema";

/**
 * The whole catalogue, in location order, filtered to what this user uses.
 *
 * Here the gate *filters*: a list of things you can't use isn't a refusal, it's
 * just a shorter list. `getBathroom` is where it refuses.
 *
 * One `aggregates()` call covers every row: `global_score` is the mean of every
 * user's personal (rank-derived) score, `null` until somebody reviews the room.
 */
export function listBathrooms(req: Request): Bathroom[] {
  const user = requireUser(req);
  const agg = aggregates();
  const saved = bookmarkedIds(user.id);

  return [...bathroomsById().values()]
    .filter(row => canUse(user.washroom_pref, row.washroom_type))
    .sort(byLocation)
    .map(row => toBathroom(row, agg, saved));
}

/**
 * One washroom, with everything the detail screen shows: your review, the
 * reviews of people you follow, and which of your saved lists it's on.
 *
 * The gate **rejects** here (403) rather than returning a stripped row: a screen
 * must not be able to quietly render a washroom its user doesn't use. Every score
 * on this page is derived from rank by `scoredReviews()`; none is stored.
 */
export function getBathroom(req: Request & { params: { id: string } }): BathroomDetail {
  const user = requireUser(req);
  const id = numericParam(req.params.id, "bathroom");
  const row = bathroomRow(id);
  assertUsable(user, row);

  const mine = scoredReviews(user.id).find(r => r.review.bathroom_id === id);

  // Friends' takes, best first. Each score is that friend's own ranking, not
  // the global mean and not yours.
  const friend_reviews: FriendReview[] = followeeIds(user.id)
    .flatMap(friendId => {
      const found = scoredReviews(friendId).find(r => r.review.bathroom_id === id);
      if (!found) return [];
      return [
        {
          user: summarize(userRow(friendId), user.id),
          score: found.score,
          note: found.review.note,
          created_at: found.review.created_at,
        } satisfies FriendReview,
      ];
    })
    .sort((a, b) => b.score - a.score);

  const saved = (table: typeof bookmarks | typeof want_to_go): boolean =>
    db
      .select()
      .from(table)
      .where(and(eq(table.user_id, user.id), eq(table.bathroom_id, id)))
      .get() !== undefined;

  return {
    ...toBathroom(row, aggregates(), bookmarkedIds(user.id)),
    my_review: mine ? withScore(mine.review, mine.score) : null,
    friend_reviews,
    want_to_go: saved(want_to_go),
  };
}
