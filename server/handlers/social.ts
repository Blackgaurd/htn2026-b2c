/**
 * Social: the friends feed, user search, following, and profiles.
 *
 * This is where the gender gate has its two documented exceptions. `GET /api/feed`
 * returns reviews of **every** washroom type (that's the point of a social feed)
 * and marks each row `can_use` so the screen can render it read-only.
 * `Profile.recent` is not gender-filtered either, for the same reason: you can
 * see what a friend rated, and the badge says which washroom.
 *
 * Following is instant and one-directional. No requests, no accept/decline, no
 * pending state. Mirrors `src/mocks/client.ts:427-499`.
 */

import { and, eq } from "drizzle-orm";
import {
  canUse,
  PROFILE_ACTIVITY_LIMIT,
  round1,
  type FeedEntry,
  type Profile,
  type ProfileActivity,
  type UserSummary,
} from "../../shared/api";
import { db } from "../db";
import {
  aggregates,
  bathroomsById,
  followeeIds,
  HttpError,
  numericParam,
  rankingsFor,
  requireUser,
  scoredReviews,
  summarize,
  toBathroom,
  userRow,
  withScore,
  type UserRow,
} from "../lib";
import { follows, users } from "../schema";

type IdReq = Request & { params: { id: string } };

// ─── The feed ─────────────────────────────────────────────────────────────────

/**
 * Reviews from everyone you follow, newest first, of *any* washroom type.
 * `can_use` is what the row uses to decide whether its actions are live.
 *
 * The score on each entry is the **reviewer's** personal score, not the global
 * one: `scoredReviews()` replays that user's own ranking. `aggregates()` runs
 * once for the whole feed: it walks every review in the database, so calling it
 * per row would be the one expensive mistake here.
 */
export function listFeed(req: Request): FeedEntry[] {
  const viewer = requireUser(req);
  const agg = aggregates();
  const rooms = bathroomsById();

  const entries = followeeIds(viewer.id).flatMap(followeeId => {
    const author = userRow(followeeId);
    const summary = summarize(author, viewer.id);

    return scoredReviews(followeeId).flatMap(({ review, score }) => {
      const room = rooms.get(review.bathroom_id);
      if (!room) return []; // catalogue row retired out from under a review
      return [
        {
          review: withScore(review, score),
          user: summary,
          bathroom: toBathroom(room, agg),
          can_use: canUse(viewer.washroom_pref, room.washroom_type),
        } satisfies FeedEntry,
      ];
    });
  });

  // `created_at` is "YYYY-MM-DD HH:MM:SS", so a string compare is a date compare.
  return entries.sort((a, b) => b.review.created_at.localeCompare(a.review.created_at));
}

// ─── Following ────────────────────────────────────────────────────────────────

/** An empty query lists everyone else, as suggestions, not an empty result. */
export function searchUsers(req: Request): UserSummary[] {
  const viewer = requireUser(req);
  const raw = new URL(req.url).searchParams.get("q") ?? "";
  const q = raw.trim().toLowerCase().replace(/^@/, "");

  return db
    .select()
    .from(users)
    .all()
    .filter(u => u.id !== viewer.id)
    .filter(
      u => !q || u.username.toLowerCase().includes(q) || u.display_name.toLowerCase().includes(q),
    )
    .map(u => summarize(u, viewer.id))
    .sort(
      (a, b) =>
        Number(a.following) - Number(b.following) || a.display_name.localeCompare(b.display_name),
    );
}

/**
 * Delete-then-insert, so a repeated PUT is a no-op rather than a primary-key
 * collision. Following is one-directional: this writes exactly one edge and
 * never the mirror of it.
 */
function setFollow(req: IdReq, on: boolean): UserSummary {
  const viewer = requireUser(req);
  const id = numericParam(req.params.id, "user");
  if (id === viewer.id) throw new HttpError(400, "you already know what you think");

  const target: UserRow = userRow(id);

  db.delete(follows)
    .where(and(eq(follows.follower_id, viewer.id), eq(follows.followee_id, id)))
    .run();
  if (on) db.insert(follows).values({ follower_id: viewer.id, followee_id: id }).run();

  return summarize(target, viewer.id);
}

export function putFollow(req: IdReq): UserSummary {
  return setFollow(req, true);
}

export function deleteFollow(req: IdReq): UserSummary {
  return setFollow(req, false);
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

/**
 * The same reviews the rankings screen serves, newest first instead of best
 * first. Rank still comes from `scoredReviews`, so an activity row and a
 * rankings row can never disagree about where a washroom sits.
 */
function activityFor(userId: number): ProfileActivity[] {
  const agg = aggregates();
  const rooms = bathroomsById();

  return scoredReviews(userId)
    .map(({ review, score, rank }) => {
      const room = rooms.get(review.bathroom_id);
      if (!room) throw new HttpError(500, `review ${review.id} points at a washroom that is gone`);
      return { review: withScore(review, score), bathroom: toBathroom(room, agg), rank };
    })
    .sort((a, b) => b.review.created_at.localeCompare(a.review.created_at) || b.review.id - a.review.id)
    .slice(0, PROFILE_ACTIVITY_LIMIT);
}

/**
 * Someone's profile. Their activity is *not* gender-filtered, same rule as the
 * feed: you can see what a friend rated, the badge says which washroom it was.
 *
 * `following_count` counts edges where the target is the *follower*;
 * `followers_count` counts edges where they are the *followee*. Different
 * numbers, and swapping them is the easy bug.
 */
function profileFor(viewer: UserRow, target: UserRow): Profile {
  const ranked = rankingsFor(target.id);
  const edges = db.select().from(follows).all();

  return {
    user: summarize(target, viewer.id),
    reviewed_count: ranked.length,
    average_score: ranked.length
      ? round1(ranked.reduce((sum, r) => sum + r.score, 0) / ranked.length)
      : null,
    following_count: edges.filter(e => e.follower_id === target.id).length,
    followers_count: edges.filter(e => e.followee_id === target.id).length,
    recent: activityFor(target.id),
  };
}

export function myProfile(req: Request): Profile {
  const viewer = requireUser(req);
  return profileFor(viewer, viewer);
}

export function profileOf(req: IdReq): Profile {
  const viewer = requireUser(req);
  return profileFor(viewer, userRow(numericParam(req.params.id, "user")));
}
