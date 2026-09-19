/**
 * THE CONTRACT — owned by the frontend.
 *
 * The frontend declares the shape it needs here; the backend's job is to catch up
 * and serve exactly that. A field in this file that `data.db` doesn't have yet is a
 * backend to-do, not a frontend bug — don't narrow it to match what the server
 * currently returns. Changing it breaks the other half's build instantly (which is
 * the point, but say it out loud before you do it).
 *
 * Nothing here may import from `src/` or `server/`. Types, pure helpers and URL
 * builders only, so it is safe to pull into the browser bundle.
 */

// ─── Domain primitives ────────────────────────────────────────────────────────

export type Building = "E5" | "E7";

/**
 * There are three kinds of washroom. There is deliberately no "accessible" type —
 * accessibility is a rating category (and the catalogue's `accessible` flag), not a
 * separate room you're sorted into.
 */
export type WashroomType = "female" | "male" | "universal";

/** What a user says they use. Same three values; it gates what they can see. */
export type WashroomPref = WashroomType;

/** The three tiers a review is sorted into before the comparison duel runs. */
export type Bucket = "loved" | "fine" | "never";

/** The five things a review scores, 1–5 each. */
export type RatingCategory =
  | "cleanliness"
  | "accessibility"
  | "hygiene"
  | "privacy"
  | "smell";

export type Ratings = { [K in RatingCategory]: number };

export const RATING_CATEGORIES: readonly RatingCategory[] = [
  "cleanliness",
  "accessibility",
  "hygiene",
  "privacy",
  "smell",
] as const;

// ─── The visibility rule ──────────────────────────────────────────────────────

/**
 * Which washroom types a user is allowed to see, bookmark, rate and rank.
 *
 * Defined once, here, so the screens, the mock client and `server/routes.ts` can
 * never disagree about it. The one place this rule does NOT apply is the friends
 * feed — you see a friend's review of any washroom, with the type spelled out on
 * the row. See `FeedEntry.can_use`.
 */
export function visibleTypes(pref: WashroomPref): WashroomType[] {
  return pref === "universal" ? ["universal"] : [pref, "universal"];
}

/** True if a user with this preference may act on this washroom. */
export function canUse(pref: WashroomPref, type: WashroomType): boolean {
  return visibleTypes(pref).includes(type);
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Score is DERIVED FROM RANK, never typed in by the user.
 *
 * A review lands in a bucket, the comparison duel decides where inside that bucket
 * it sits, and the position within the bucket maps onto the bucket's band. That
 * means inserting a new bathroom above an old one moves the old one's score — which
 * is why `position` is what's persisted and score is computed on read.
 */
export const BUCKET_BANDS: Record<Bucket, readonly [number, number]> = {
  loved: [6.7, 10.0],
  fine: [3.4, 6.6],
  never: [0.0, 3.3],
};

/** Buckets from best to worst — the order a user's full ranking is assembled in. */
export const BUCKET_ORDER: readonly Bucket[] = ["loved", "fine", "never"] as const;

export const BUCKET_LABELS: Record<Bucket, string> = {
  loved: "Loved it",
  fine: "It was fine",
  never: "Never again",
};

/**
 * `position` is 0-based and best-first within the bucket; `total` is how many
 * reviews share that bucket once this one is in it. A lone review sits mid-band so
 * it has somewhere to move in both directions.
 */
export function scoreForPosition(bucket: Bucket, position: number, total: number): number {
  const band = BUCKET_BANDS[bucket];
  const [low, high] = band;
  if (total <= 1) return round1((low + high) / 2);
  const clamped = Math.min(Math.max(position, 0), total - 1);
  return round1(high - ((high - low) * clamped) / (total - 1));
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** The average of the five categories, on the same 0–10 scale as a score. */
export function ratingsAverage(ratings: Ratings): number {
  const sum = RATING_CATEGORIES.reduce((acc, key) => acc + ratings[key], 0);
  return round1((sum / RATING_CATEGORIES.length) * 2);
}

// ─── Stored rows ──────────────────────────────────────────────────────────────

/**
 * A catalogue row exactly as it sits in the database.
 *
 * The catalogue is fixed — see `shared/catalogue.ts`. Users pick from it; they
 * never create rows in it, and there is no endpoint that would let them.
 */
export type BathroomRow = {
  id: number;
  building: Building;
  floor: number;
  /** Human-readable location, e.g. "E7 3rd Floor — North Wing, beside stairwell". */
  location: string;
  washroom_type: WashroomType;
  /** Has an accessible stall. A property of the room, not a room of its own. */
  accessible: boolean;
};

/** What the API actually serves: the stored row plus the aggregates every list needs. */
export type Bathroom = BathroomRow & {
  /** Mean of every user's personal score. `null` until somebody reviews it. */
  global_score: number | null;
  review_count: number;
};

export type User = {
  id: number;
  username: string;
  display_name: string;
  email: string;
  washroom_pref: WashroomPref;
  /** Hex, assigned at register. Drives the avatar chip everywhere. */
  avatar_color: string;
  /** SQLite `datetime('now')` — UTC, "YYYY-MM-DD HH:MM:SS". */
  created_at: string;
};

export type ReviewRow = {
  id: number;
  user_id: number;
  bathroom_id: number;
  cleanliness: number;
  accessibility: number;
  hygiene: number;
  privacy: number;
  smell: number;
  note: string | null;
  bucket: Bucket;
  /** 0-based, best-first, within this user's bucket. The thing rank is made of. */
  position: number;
  created_at: string;
};

/** A review as served: the stored row plus the score its position works out to. */
export type Review = ReviewRow & { score: number };

// ─── Composed views ───────────────────────────────────────────────────────────

/** Another user, as seen by the signed-in user. */
export type UserSummary = {
  id: number;
  username: string;
  display_name: string;
  avatar_color: string;
  washroom_pref: WashroomPref;
  /** Whether the signed-in user follows them. Always false for yourself. */
  following: boolean;
};

/** One entry of a user's ranked list. `rank` is 1-based across all buckets. */
export type RankedBathroom = {
  bathroom: Bathroom;
  review_id: number;
  score: number;
  rank: number;
  bucket: Bucket;
  position: number;
  /** The 1–5 category ratings behind it, so the list can re-sort without refetching. */
  ratings: Ratings;
};

export type FriendReview = {
  user: UserSummary;
  score: number;
  note: string | null;
  created_at: string;
};

export type BathroomDetail = Bathroom & {
  my_review: Review | null;
  friend_reviews: FriendReview[];
  bookmarked: boolean;
  want_to_go: boolean;
};

/**
 * One row of the friends feed.
 *
 * `can_use` is the gate: the feed shows reviews of every washroom type, but a row
 * for a washroom outside your preference is read-only — no bookmark, no rate, no
 * compare. The row must always render the washroom type explicitly.
 */
export type FeedEntry = {
  review: Review;
  user: UserSummary;
  bathroom: Bathroom;
  can_use: boolean;
};

export type Profile = {
  user: UserSummary;
  reviewed_count: number;
  /** Mean of the scores this user has given. `null` before their first review. */
  average_score: number | null;
  following_count: number;
  followers_count: number;
  /**
   * Their top three, best first. Deliberately NOT gender-filtered — same rule as
   * the feed: you can see what a friend ranked, and the badge says which washroom.
   */
  top: RankedBathroom[];
};

// ─── Request bodies ───────────────────────────────────────────────────────────

export type RegisterBody = {
  username: string;
  display_name: string;
  email: string;
  password: string;
  washroom_pref: WashroomPref;
};

export type LoginBody = { email: string; password: string };

export type SubmitReviewBody = {
  bathroom_id: number;
  ratings: Ratings;
  note: string | null;
  bucket: Bucket;
  /**
   * Where the duel decided this belongs inside its bucket — 0-based, best first.
   * The screen gets this from `src/lib/duel.ts`; it is never a raw user input.
   */
  position: number;
};

export type SubmitReviewResult = {
  review: Review;
  /** 1-based position in the user's whole list, across buckets. */
  rank: number;
  /** The score this bathroom had for this user before, if they'd rated it. */
  previous_score: number | null;
  /** The freshly recomputed list — every score above the insert point may have moved. */
  rankings: RankedBathroom[];
};

/** What every failed response looks like. Frontend can rely on this shape. */
export type ApiError = { error: string };

// ─── URLs ─────────────────────────────────────────────────────────────────────

/**
 * URL builders, shared by both sides so paths can never drift apart.
 * The server registers the `routePatterns`; the client calls these to build
 * concrete URLs.
 */
export const paths = {
  register: "/api/register",
  login: "/api/login",
  me: "/api/me",

  bathrooms: "/api/bathrooms",
  bathroom: (id: number | string) => `/api/bathrooms/${id}`,

  rankings: "/api/rankings",
  reviews: "/api/reviews",

  bookmarks: "/api/bookmarks",
  bookmark: (id: number | string) => `/api/bookmarks/${id}`,
  wantToGo: "/api/want-to-go",
  wantToGoItem: (id: number | string) => `/api/want-to-go/${id}`,

  feed: "/api/feed",
  users: (query: string) => `/api/users?q=${encodeURIComponent(query)}`,
  follow: (id: number | string) => `/api/users/${id}/follow`,
  profile: (id?: number) => (id === undefined ? "/api/profile" : `/api/profile/${id}`),
} as const;

/** Route patterns as the server registers them (`:id` placeholders intact). */
export const routePatterns = {
  register: "/api/register",
  login: "/api/login",
  me: "/api/me",

  bathrooms: "/api/bathrooms",
  bathroom: "/api/bathrooms/:id",

  rankings: "/api/rankings",
  reviews: "/api/reviews",

  bookmarks: "/api/bookmarks",
  bookmark: "/api/bookmarks/:id",
  wantToGo: "/api/want-to-go",
  wantToGoItem: "/api/want-to-go/:id",

  feed: "/api/feed",
  users: "/api/users",
  follow: "/api/users/:id/follow",
  profile: "/api/profile",
  profileOf: "/api/profile/:id",
} as const;

// ─── The operation surface ────────────────────────────────────────────────────

/**
 * Every operation the frontend can perform.
 *
 * Two implementations satisfy it — the HTTP client in `src/api.ts` and the mock
 * client in `src/mocks/client.ts` — so they can never drift apart, and components
 * can't tell which one they got. It doubles as the backend's to-do list: an
 * operation here with no handler in `server/routes.ts` is work not done yet.
 *
 * Every read is already scoped to the signed-in user and filtered by their
 * washroom preference. Screens never filter by gender themselves.
 */
export type ApiClient = {
  // Session. No tokens, no password hashing worth the name — see CLAUDE.md.
  register(body: RegisterBody): Promise<User>;
  login(body: LoginBody): Promise<User>;
  currentUser(): Promise<User | null>;
  logout(): Promise<void>;

  // The fixed catalogue, gender-filtered. There is no `createBathroom` on purpose.
  listBathrooms(): Promise<Bathroom[]>;
  getBathroom(id: number): Promise<BathroomDetail>;

  // Ranking.
  listMyRankings(): Promise<RankedBathroom[]>;
  submitReview(body: SubmitReviewBody): Promise<SubmitReviewResult>;

  // Saved lists. Both reject a washroom outside the user's preference.
  listBookmarks(): Promise<Bathroom[]>;
  setBookmark(bathroomId: number, on: boolean): Promise<{ bathroom_id: number; bookmarked: boolean }>;
  listWantToGo(): Promise<Bathroom[]>;
  setWantToGo(bathroomId: number, on: boolean): Promise<{ bathroom_id: number; want_to_go: boolean }>;

  // Social.
  listFeed(): Promise<FeedEntry[]>;
  searchUsers(query: string): Promise<UserSummary[]>;
  setFollow(userId: number, on: boolean): Promise<UserSummary>;
  getProfile(userId?: number): Promise<Profile>;
};
