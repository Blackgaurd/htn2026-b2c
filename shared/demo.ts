/**
 * DEMO DATA, the people and reviews the app opens with.
 *
 * Lives beside `catalogue.ts` and for the same reason: `src/mocks/data.ts` and
 * `server/seed.ts` both need it, and neither may import from the other. Writing it
 * once means a mock demo and a live demo show the same feed, the same friends and
 * the same global scores, so `?mock=0` proves the backend works instead of just
 * looking different.
 *
 * Imports nothing but the contract's types.
 *
 * Reviews are listed best-first inside each (user, bucket) group and their
 * `position` is derived from that order by `demoReviews()`, so re-ordering two
 * lines here re-ranks a user, and you can never write a duplicate or a gap.
 */

import type { Rating, ReviewDetails, ReviewRow, User } from "./api";
import { bucketForRating, detailKeysFor } from "./api";
import { CATALOGUE } from "./catalogue";

export type DemoUser = User & {
  /**
   * Stored so login has something to compare, but nothing hashes it and nothing
   * rejects a wrong one, see the auth note in CLAUDE.md. Do not ship this.
   */
  password: string;
};

/** Every demo account uses the same password, including yours. */
export const DEMO_PASSWORD = "pupi";

/** You. `src/mocks/client.ts` opens signed in as this id. */
export const DEMO_CURRENT_USER_ID = 1;

export const DEMO_USERS: readonly DemoUser[] = [
  { id: 1, username: "flushmaster99", display_name: "Alex Chen", email: "a24chen@uwaterloo.ca", bio: '4A Systems Design. Will walk three floors for a good one.', washroom_pref: "female", avatar_color: "#7B8CDE", created_at: "2026-09-12 09:14:00", password: DEMO_PASSWORD },
  { id: 2, username: "mayaloo", display_name: "Maya Rahman", email: "m3rahman@uwaterloo.ca", bio: 'Nano, class of 2027. Cleanliness is non-negotiable.', washroom_pref: "female", avatar_color: "#9B78D4", created_at: "2026-09-12 10:02:00", password: DEMO_PASSWORD },
  { id: 3, username: "jordank", display_name: "Jordan Kim", email: "j8kim@uwaterloo.ca", bio: 'Mech eng. Ranking every washroom between me and the machine shop.', washroom_pref: "male", avatar_color: "#5B8FE8", created_at: "2026-09-12 11:31:00", password: DEMO_PASSWORD },
  { id: 4, username: "priyam", display_name: "Priya Menon", email: "p2menon@uwaterloo.ca", bio: 'Tron 2B. Single stalls supremacist.', washroom_pref: "female", avatar_color: "#E87DB8", created_at: "2026-09-13 08:45:00", password: DEMO_PASSWORD },
  { id: 5, username: "samlee", display_name: "Sam Lee", email: "s9lee@uwaterloo.ca", bio: 'Grad student, E7 resident. I know where the quiet ones are.', washroom_pref: "universal", avatar_color: "#5EC4A8", created_at: "2026-09-13 14:20:00", password: DEMO_PASSWORD },
  { id: 6, username: "atran", display_name: "Alex Tran", email: "a5tran@uwaterloo.ca", bio: 'Civil. Here for the data.', washroom_pref: "male", avatar_color: "#F5A623", created_at: "2026-09-14 16:07:00", password: DEMO_PASSWORD },
];

type DemoReviewSeed = {
  user_id: number;
  bathroom_id: number;
  /** Stars, 1–5. The band follows from it via `bucketForRating()`. */
  rating: Rating;
  note: string | null;
  created_at: string;
};

/**
 * Detail ratings, derived from the star rating rather than hand-written.
 *
 * They're colour on a review, not data anyone reasons about, and writing six more
 * numbers on thirty-four rows would be thirty-four more chances to typo. A 5★
 * review reads mostly-5s, a 1★ reads mostly-1s, and the ±1 wobble keeps every bar
 * from being the same length.
 */
function detailsFor(seed: DemoReviewSeed): ReviewDetails {
  const bathroom = CATALOGUE.find(b => b.id === seed.bathroom_id);
  if (!bathroom) return {};

  const details: ReviewDetails = {};
  detailKeysFor(bathroom.washroom_type).forEach((key, index) => {
    const wobble = [0, 1, -1, 0, 1, -1][index] ?? 0;
    const value = Math.min(5, Math.max(1, seed.rating + wobble));
    details[key] = value as Rating;
  });
  return details;
}

/**
 * Order matters: within one user's band, earlier means better. The band itself is
 * derived from the stars, so a 5★ row can never sit below a 3★ one.
 *
 * Every row must point at a washroom the reviewer is actually allowed to use,
 * that's the rule the app enforces, so the fixtures have to obey it too or the
 * gender gate looks broken on first paint.
 *
 * `created_at` is deliberately out of step with that order for the signed-in
 * demo user. The profile's activity tab is sorted by recency; when somebody
 * happens to have rated their favourites first, that tab renders as the rankings
 * screen upside down and the two tabs look like one feature drawn twice.
 */
const SEEDS: readonly DemoReviewSeed[] = [
  // ─── 1 · Alex Chen (you), female + universal ───────────────────────────────
  { user_id: 1, bathroom_id: 6, rating: 5, note: "Spotless every single time. The lighting actually makes you look good.", created_at: "2026-09-16 09:30:00" },
  { user_id: 1, bathroom_id: 3, rating: 5, note: "Single occupancy, locks properly, nobody knocks. Elite.", created_at: "2026-09-15 15:40:00" },
  { user_id: 1, bathroom_id: 21, rating: 5, note: "Nobody knows about this one. Keep it that way.", created_at: "2026-09-18 08:12:00" },
  { user_id: 1, bathroom_id: 17, rating: 3, note: "Fine. Gets busy right after the 11:30 lectures let out.", created_at: "2026-09-15 10:12:00" },
  { user_id: 1, bathroom_id: 14, rating: 3, note: "Central, so it's always a bit of a scene.", created_at: "2026-09-17 14:33:00" },
  { user_id: 1, bathroom_id: 9, rating: 3, note: "Soap dispenser has been empty since week 2.", created_at: "2026-09-16 16:22:00" },
  { user_id: 1, bathroom_id: 19, rating: 1, note: "The hand dryer is louder than the fire alarm and the floor was wet.", created_at: "2026-09-17 09:48:00" },

  // ─── 2 · Maya Rahman, female + universal ───────────────────────────────────
  { user_id: 2, bathroom_id: 21, rating: 5, note: "Quiet wing, always clean. Best on campus, I will not be taking questions.", created_at: "2026-09-16 10:15:00" },
  { user_id: 2, bathroom_id: 6, rating: 5, note: "Everyone raves about this one. It's good, not #1 good.", created_at: "2026-09-15 12:30:00" },
  { user_id: 2, bathroom_id: 1, rating: 4, note: "Close to the entrance and somehow never busy.", created_at: "2026-09-17 08:55:00" },
  { user_id: 2, bathroom_id: 15, rating: 3, note: "Does the job between classes.", created_at: "2026-09-18 09:20:00" },
  { user_id: 2, bathroom_id: 24, rating: 3, note: "Fine, but the light flickers the whole time.", created_at: "2026-09-18 15:44:00" },

  // ─── 3 · Jordan Kim, male + universal ──────────────────────────────────────
  { user_id: 3, bathroom_id: 22, rating: 5, note: "Research wing perks. Never a line.", created_at: "2026-09-15 14:02:00" },
  { user_id: 3, bathroom_id: 16, rating: 4, note: "Big, bright, well stocked.", created_at: "2026-09-16 11:37:00" },
  { user_id: 3, bathroom_id: 5, rating: 3, note: "It exists.", created_at: "2026-09-17 10:41:00" },
  { user_id: 3, bathroom_id: 2, rating: 3, note: "Right by the door, so it's a zoo at 10am.", created_at: "2026-09-17 17:12:00" },
  { user_id: 3, bathroom_id: 7, rating: 3, note: "Paper towels are always out.", created_at: "2026-09-18 12:26:00" },
  { user_id: 3, bathroom_id: 20, rating: 1, note: "Something has died in here.", created_at: "2026-09-18 18:03:00" },

  // ─── 4 · Priya Menon, female + universal ───────────────────────────────────
  { user_id: 4, bathroom_id: 3, rating: 5, note: "Single stall or nothing.", created_at: "2026-09-16 14:50:00" },
  { user_id: 4, bathroom_id: 6, rating: 5, note: "Genuinely looked forward to this one.", created_at: "2026-09-16 09:11:00" },
  { user_id: 4, bathroom_id: 17, rating: 3, note: "Solid backup if the 3rd floor is full.", created_at: "2026-09-17 13:19:00" },
  { user_id: 4, bathroom_id: 25, rating: 3, note: "Nice view of the Ideas Clinic, that's about it.", created_at: "2026-09-18 10:33:00" },
  { user_id: 4, bathroom_id: 19, rating: 1, note: "Avoid between 12 and 1.", created_at: "2026-09-18 16:58:00" },

  // ─── 5 · Sam Lee, universal only ───────────────────────────────────────────
  { user_id: 5, bathroom_id: 27, rating: 5, note: "Top floor, nobody comes up here. Perfect.", created_at: "2026-09-15 16:45:00" },
  { user_id: 5, bathroom_id: 3, rating: 5, note: "The gold standard for a single stall.", created_at: "2026-09-16 12:08:00" },
  { user_id: 5, bathroom_id: 8, rating: 4, note: "Kitchenette adjacent and always stocked.", created_at: "2026-09-17 11:52:00" },
  { user_id: 5, bathroom_id: 14, rating: 3, note: "Busy but reliable.", created_at: "2026-09-17 19:27:00" },
  { user_id: 5, bathroom_id: 23, rating: 3, note: "A bit of a walk from anywhere you'd actually be.", created_at: "2026-09-18 13:14:00" },
  { user_id: 5, bathroom_id: 13, rating: 2, note: "Permanently out of soap.", created_at: "2026-09-18 17:39:00" },

  // ─── 6 · Alex Tran, male + universal, and NOT followed by you ──────────────
  { user_id: 6, bathroom_id: 10, rating: 4, note: "Underrated.", created_at: "2026-09-17 15:30:00" },
  { user_id: 6, bathroom_id: 18, rating: 3, note: null, created_at: "2026-09-18 08:24:00" },
  { user_id: 6, bathroom_id: 26, rating: 2, note: "The door doesn't lock.", created_at: "2026-09-18 14:01:00" },
];

/**
 * The seeds expanded into real rows: sequential ids, and `position` derived from
 * each row's order within its (user, bucket) group.
 */
export function demoReviews(): ReviewRow[] {
  const seen = new Map<string, number>();
  return SEEDS.map((seed, i) => {
    const key = `${seed.user_id}:${bucketForRating(seed.rating)}`;
    const position = seen.get(key) ?? 0;
    seen.set(key, position + 1);
    const details = detailsFor(seed);
    return {
      id: i + 1,
      user_id: seed.user_id,
      bathroom_id: seed.bathroom_id,
      rating: seed.rating,
      cleanliness: details.cleanliness ?? null,
      accessibility: details.accessibility ?? null,
      smell: details.smell ?? null,
      hygiene: details.hygiene ?? null,
      privacy: details.privacy ?? null,
      products: details.products ?? null,
      photos: [],
      note: seed.note,
      bucket: bucketForRating(seed.rating),
      position,
      created_at: seed.created_at,
    };
  });
}

/** `[follower, followee]`. One-directional: following is not mutual by default. */
export const DEMO_FOLLOWS: readonly (readonly [number, number])[] = [
  [1, 2], [1, 3], [1, 4], [1, 5],
  [2, 1], [3, 1], [4, 1], [6, 1],
  [2, 4], [4, 2], [3, 6], [5, 2],
];

/** `[user_id, bathroom_id]`, every pair must pass that user's gender gate. */
export const DEMO_BOOKMARKS: readonly (readonly [number, number])[] = [
  [1, 6], [1, 21], [1, 3],
  [2, 6], [3, 22], [4, 3], [5, 27],
];

/** `[user_id, bathroom_id]`, bathrooms they haven't reviewed but mean to. */
export const DEMO_WANT_TO_GO: readonly (readonly [number, number])[] = [
  [1, 27], [1, 11],
  [2, 8], [3, 26], [5, 21],
];
