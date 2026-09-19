/**
 * The fixture-backed `ApiClient`. Stands in for the whole backend.
 *
 * Writes are real: reviewing, ranking, bookmarking and following all mutate an
 * in-memory copy of `data.ts`, so the UI behaves like it's talking to a database.
 * State lives for the life of the page — a reload puts the fixtures back, which is
 * the fastest possible reset.
 *
 * Two behaviours here are load-bearing rather than convenient, and
 * `server/routes.ts` has to match them:
 *
 *  1. **Score is derived, never stored.** `position` inside a bucket is what's
 *     persisted; every read recomputes the score from the order. That's why
 *     inserting a bathroom near the top visibly moves the ones below it.
 *  2. **The gender gate is enforced, not hidden.** Asking for a washroom outside
 *     your preference throws instead of returning it, so a screen can't quietly
 *     bookmark a men's room for someone who doesn't use one. The friends feed is
 *     the documented exception and carries `can_use` per row.
 *
 * No latency simulation, no injected failures.
 */

import type {
  ApiClient,
  Bathroom,
  BathroomDetail,
  BathroomRow,
  FeedEntry,
  FriendReview,
  Profile,
  RankedBathroom,
  Review,
  ReviewRow,
  User,
  UserSummary,
} from "../../shared/api";
import {
  BUCKET_ORDER,
  MAX_REVIEW_PHOTOS,
  bucketForRating,
  canUse,
  detailKeysFor,
  round1,
  scoreForPosition,
} from "../../shared/api";
import type { DemoUser } from "../../shared/demo";
import { readUserId, writeUserId } from "../session";
import { DEFAULT_USER_ID, freshState, type MockState } from "./data";

/** Mutable session copy — the fixtures themselves are never touched. */
let state: MockState = freshState();

/**
 * Mocks open signed in so the whole app is one tap away, but an explicit log out
 * has to stick for the rest of the page view — otherwise the splash and register
 * screens are unreachable. A reload starts you signed in again.
 */
let signedOut = false;

/** Matches SQLite's `datetime('now')`: UTC, "YYYY-MM-DD HH:MM:SS". */
const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");

const copy = <T>(value: T): T => structuredClone(value);

// ─── Lookups ──────────────────────────────────────────────────────────────────

function currentUserRow(): DemoUser {
  const id = readUserId();
  const user = id === null ? undefined : state.users.find(u => u.id === id);
  if (!user) throw new Error("not signed in");
  return user;
}

function userRow(id: number): DemoUser {
  const user = state.users.find(u => u.id === id);
  if (!user) throw new Error(`no user ${id}`);
  return user;
}

function bathroomRow(id: number): BathroomRow {
  const row = state.bathrooms.find(b => b.id === id);
  if (!row) throw new Error(`no bathroom ${id}`);
  return row;
}

/** The gate. Throws the same message the HTTP client surfaces from a 403. */
function assertUsable(user: DemoUser, row: BathroomRow): void {
  if (!canUse(user.washroom_pref, row.washroom_type)) {
    throw new Error("that washroom isn't one you use");
  }
}

const publicUser = ({ password, ...user }: DemoUser): User => ({ ...user });

function summarize(user: DemoUser, viewerId: number): UserSummary {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    avatar_color: user.avatar_color,
    washroom_pref: user.washroom_pref,
    following: state.follows.some(f => f.follower_id === viewerId && f.followee_id === user.id),
  };
}

// ─── Derivation: position → score ─────────────────────────────────────────────

type ScoredReview = { review: ReviewRow; score: number; rank: number };

/**
 * One user's whole list, best first, with the score each position works out to.
 *
 * Deliberately recomputed from the *order* rather than trusting the stored
 * `position` number, so a gap or a duplicate left by a bad write heals itself on
 * the next read instead of corrupting the list.
 */
function scoredReviews(userId: number): ScoredReview[] {
  const mine = state.reviews.filter(r => r.user_id === userId);
  const out: ScoredReview[] = [];

  for (const bucket of BUCKET_ORDER) {
    const inBucket = mine
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

/** Every bathroom's global score: the mean of each reviewer's personal score. */
function aggregates(): Map<number, { global_score: number; review_count: number }> {
  const collected = new Map<number, number[]>();

  for (const user of state.users) {
    for (const { review, score } of scoredReviews(user.id)) {
      const scores = collected.get(review.bathroom_id) ?? [];
      scores.push(score);
      collected.set(review.bathroom_id, scores);
    }
  }

  const out = new Map<number, { global_score: number; review_count: number }>();
  for (const [bathroomId, scores] of collected) {
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    out.set(bathroomId, { global_score: round1(mean), review_count: scores.length });
  }
  return out;
}

function toBathroom(
  row: BathroomRow,
  agg: Map<number, { global_score: number; review_count: number }>,
): Bathroom {
  const found = agg.get(row.id);
  return {
    ...row,
    global_score: found?.global_score ?? null,
    review_count: found?.review_count ?? 0,
  };
}

const withScore = (review: ReviewRow, score: number): Review => ({ ...copy(review), score });

function rankingsFor(userId: number): RankedBathroom[] {
  const agg = aggregates();
  return scoredReviews(userId).map(({ review, score, rank }) => ({
    bathroom: toBathroom(bathroomRow(review.bathroom_id), agg),
    review_id: review.id,
    score,
    rank,
    bucket: review.bucket,
    position: review.position,
    rating: review.rating,
  }));
}

const byLocation = (a: BathroomRow, b: BathroomRow) =>
  a.building.localeCompare(b.building) || a.floor - b.floor || a.id - b.id;

// ─── The client ───────────────────────────────────────────────────────────────

export const mockClient: ApiClient = {
  // ── Session ────────────────────────────────────────────────────────────────

  async register(body) {
    const username = body.username.trim().replace(/^@/, "");
    const email = body.email.trim().toLowerCase();
    if (!username) throw new Error("username is required");
    if (!email) throw new Error("email is required");
    if (state.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error(`@${username} is taken`);
    }
    if (state.users.some(u => u.email.toLowerCase() === email)) {
      throw new Error("that email already has an account");
    }

    const palette = ["#7B8CDE", "#9B78D4", "#5B8FE8", "#E87DB8", "#5EC4A8", "#F5A623"];
    const created: DemoUser = {
      id: state.users.reduce((max, u) => Math.max(max, u.id), 0) + 1,
      username,
      display_name: body.display_name.trim() || username,
      email,
      washroom_pref: body.washroom_pref,
      avatar_color: palette[state.users.length % palette.length] ?? "#7B8CDE",
      created_at: now(),
      password: body.password,
    };

    state.users.push(created);
    signedOut = false;
    writeUserId(created.id);
    return publicUser(created);
  },

  async login(body) {
    const email = body.email.trim().toLowerCase();
    const user = state.users.find(u => u.email.toLowerCase() === email);
    // No password check on purpose — see the auth note in CLAUDE.md.
    if (!user) throw new Error("no account for that email");

    signedOut = false;
    writeUserId(user.id);
    return publicUser(user);
  },

  async currentUser() {
    if (signedOut) return null;

    let id = readUserId();
    if (id === null) {
      id = DEFAULT_USER_ID;
      writeUserId(id);
    }

    const user = state.users.find(u => u.id === id);
    if (!user) {
      writeUserId(null);
      return null;
    }
    return publicUser(user);
  },

  async logout() {
    signedOut = true;
    writeUserId(null);
  },

  // ── The catalogue ──────────────────────────────────────────────────────────

  async listBathrooms() {
    const user = currentUserRow();
    const agg = aggregates();
    return state.bathrooms
      .filter(row => canUse(user.washroom_pref, row.washroom_type))
      .sort(byLocation)
      .map(row => toBathroom(row, agg));
  },

  async getBathroom(id) {
    const user = currentUserRow();
    const row = bathroomRow(id);
    assertUsable(user, row);

    const mine = scoredReviews(user.id).find(r => r.review.bathroom_id === id);

    const friendReviews: FriendReview[] = state.follows
      .filter(f => f.follower_id === user.id)
      .flatMap(f => {
        const found = scoredReviews(f.followee_id).find(r => r.review.bathroom_id === id);
        if (!found) return [];
        return [
          {
            user: summarize(userRow(f.followee_id), user.id),
            score: found.score,
            note: found.review.note,
            created_at: found.review.created_at,
          },
        ];
      })
      .sort((a, b) => b.score - a.score);

    const detail: BathroomDetail = {
      ...toBathroom(row, aggregates()),
      my_review: mine ? withScore(mine.review, mine.score) : null,
      friend_reviews: friendReviews,
      bookmarked: state.bookmarks.some(b => b.user_id === user.id && b.bathroom_id === id),
      want_to_go: state.wantToGo.some(w => w.user_id === user.id && w.bathroom_id === id),
    };
    return detail;
  },

  // ── Ranking ────────────────────────────────────────────────────────────────

  async listMyRankings() {
    return rankingsFor(currentUserRow().id);
  },

  async submitReview(body) {
    const user = currentUserRow();
    const row = bathroomRow(body.bathroom_id);
    assertUsable(user, row);

    if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
      throw new Error("rating must be a whole number from 1 to 5");
    }

    // The band follows from the stars — it is never sent separately, so the two
    // can't disagree.
    const bucket = bucketForRating(body.rating);

    const before = scoredReviews(user.id).find(r => r.review.bathroom_id === row.id);
    const previous_score = before?.score ?? null;

    // Re-rating replaces the old review outright rather than stacking a second one.
    state.reviews = state.reviews.filter(
      r => !(r.user_id === user.id && r.bathroom_id === row.id),
    );

    // Details are optional and never touch the score; drop any key that doesn't
    // apply to this washroom rather than storing a rating of a thing that isn't there.
    const allowed = new Set(detailKeysFor(row.washroom_type));
    const detail = (key: Parameters<typeof allowed.has>[0]) => {
      if (!allowed.has(key)) return null;
      const value = body.details[key];
      if (value === undefined) return null;
      if (!Number.isInteger(value) || value < 1 || value > 5) {
        throw new Error(`${key} must be a whole number from 1 to 5`);
      }
      return value;
    };

    const created: ReviewRow = {
      id: state.reviews.reduce((max, r) => Math.max(max, r.id), 0) + 1,
      user_id: user.id,
      bathroom_id: row.id,
      rating: body.rating,
      cleanliness: detail("cleanliness"),
      accessibility: detail("accessibility"),
      smell: detail("smell"),
      hygiene: detail("hygiene"),
      privacy: detail("privacy"),
      products: detail("products"),
      photos: body.photos.slice(0, MAX_REVIEW_PHOTOS),
      note: body.note?.trim() ? body.note.trim() : null,
      bucket,
      position: 0,
      created_at: now(),
    };
    state.reviews.push(created);

    // Splice it in at the duel's answer, then renumber the bucket so positions
    // stay a contiguous 0..n-1 — the order is the data, the numbers just record it.
    const bucketRows = state.reviews
      .filter(r => r.user_id === user.id && r.bucket === bucket && r.id !== created.id)
      .sort((a, b) => a.position - b.position || a.id - b.id);

    const at = Math.min(Math.max(body.position, 0), bucketRows.length);
    bucketRows.splice(at, 0, created);
    bucketRows.forEach((review, index) => {
      review.position = index;
    });

    const rankings = rankingsFor(user.id);
    const landed = rankings.find(entry => entry.review_id === created.id);
    if (!landed) throw new Error("review vanished after insert");

    return {
      review: withScore(created, landed.score),
      rank: landed.rank,
      previous_score,
      rankings,
    };
  },

  // ── Saved lists ────────────────────────────────────────────────────────────

  async listBookmarks() {
    const user = currentUserRow();
    const agg = aggregates();
    return state.bookmarks
      .filter(b => b.user_id === user.id)
      .map(b => bathroomRow(b.bathroom_id))
      .filter(row => canUse(user.washroom_pref, row.washroom_type))
      .sort(byLocation)
      .map(row => toBathroom(row, agg));
  },

  async setBookmark(bathroomId, on) {
    const user = currentUserRow();
    assertUsable(user, bathroomRow(bathroomId));

    state.bookmarks = state.bookmarks.filter(
      b => !(b.user_id === user.id && b.bathroom_id === bathroomId),
    );
    if (on) state.bookmarks.push({ user_id: user.id, bathroom_id: bathroomId });

    return { bathroom_id: bathroomId, bookmarked: on };
  },

  async listWantToGo() {
    const user = currentUserRow();
    const agg = aggregates();
    const reviewed = new Set(
      state.reviews.filter(r => r.user_id === user.id).map(r => r.bathroom_id),
    );

    return state.wantToGo
      .filter(w => w.user_id === user.id && !reviewed.has(w.bathroom_id))
      .map(w => bathroomRow(w.bathroom_id))
      .filter(row => canUse(user.washroom_pref, row.washroom_type))
      .sort(byLocation)
      .map(row => toBathroom(row, agg));
  },

  async setWantToGo(bathroomId, on) {
    const user = currentUserRow();
    assertUsable(user, bathroomRow(bathroomId));

    state.wantToGo = state.wantToGo.filter(
      w => !(w.user_id === user.id && w.bathroom_id === bathroomId),
    );
    if (on) state.wantToGo.push({ user_id: user.id, bathroom_id: bathroomId });

    return { bathroom_id: bathroomId, want_to_go: on };
  },

  // ── Social ─────────────────────────────────────────────────────────────────

  /**
   * Reviews from everyone you follow, newest first — of *any* washroom type.
   * `can_use` is what the row uses to decide whether its actions are live.
   */
  async listFeed() {
    const user = currentUserRow();
    const agg = aggregates();

    const entries: FeedEntry[] = state.follows
      .filter(f => f.follower_id === user.id)
      .flatMap(f =>
        scoredReviews(f.followee_id).map(({ review, score }) => ({
          review: withScore(review, score),
          user: summarize(userRow(f.followee_id), user.id),
          bathroom: toBathroom(bathroomRow(review.bathroom_id), agg),
          can_use: canUse(user.washroom_pref, bathroomRow(review.bathroom_id).washroom_type),
        })),
      );

    return entries.sort((a, b) => b.review.created_at.localeCompare(a.review.created_at));
  },

  /** An empty query lists people you haven't followed yet, as suggestions. */
  async searchUsers(query) {
    const user = currentUserRow();
    const q = query.trim().toLowerCase().replace(/^@/, "");

    return state.users
      .filter(u => u.id !== user.id)
      .filter(
        u =>
          !q ||
          u.username.toLowerCase().includes(q) ||
          u.display_name.toLowerCase().includes(q),
      )
      .map(u => summarize(u, user.id))
      .sort(
        (a, b) =>
          Number(a.following) - Number(b.following) ||
          a.display_name.localeCompare(b.display_name),
      );
  },

  async setFollow(userId, on) {
    const user = currentUserRow();
    if (userId === user.id) throw new Error("you already know what you think");

    const target = userRow(userId);
    state.follows = state.follows.filter(
      f => !(f.follower_id === user.id && f.followee_id === userId),
    );
    if (on) state.follows.push({ follower_id: user.id, followee_id: userId });

    return summarize(target, user.id);
  },

  /**
   * Someone's profile. Their top three is *not* gender-filtered — same rule as the
   * feed: you can see what a friend ranked, the badge says which washroom it was.
   */
  async getProfile(userId) {
    const viewer = currentUserRow();
    const target = userId === undefined ? viewer : userRow(userId);
    const ranked = rankingsFor(target.id);

    const profile: Profile = {
      user: summarize(target, viewer.id),
      reviewed_count: ranked.length,
      average_score: ranked.length
        ? round1(ranked.reduce((sum, r) => sum + r.score, 0) / ranked.length)
        : null,
      following_count: state.follows.filter(f => f.follower_id === target.id).length,
      followers_count: state.follows.filter(f => f.followee_id === target.id).length,
      top: ranked.slice(0, 3),
    };
    return profile;
  },
};

/** Test hook: throw away every in-session write without reloading the page. */
export function resetMocks(): void {
  state = freshState();
  signedOut = false;
}
