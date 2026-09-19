/**
 * The fixtures the frontend is built against.
 *
 * The rows themselves live in `shared/`, the catalogue in `shared/catalogue.ts`,
 * the people and their reviews in `shared/demo.ts`, because the backend seeds from
 * the exact same data. What this file adds is the *session copy*: a mutable snapshot
 * that `client.ts` edits so create/update/delete really work, and that a reload
 * throws away.
 *
 * These are typed as the contract's domain types, which is the whole enforcement
 * mechanism, add a required field in `shared/api.ts` and this file stops compiling
 * until it's updated. **When the contract changes, these change in the same commit.**
 * `bun run typecheck` will not let you forget.
 */

import type { BathroomRow, ReviewRow } from "../../shared/api";
import { CATALOGUE } from "../../shared/catalogue";
import type { DemoUser } from "../../shared/demo";
import {
  DEMO_BOOKMARKS,
  DEMO_CURRENT_USER_ID,
  DEMO_FOLLOWS,
  DEMO_USERS,
  DEMO_WANT_TO_GO,
  demoReviews,
} from "../../shared/demo";

/** A join row. Both tables are pure pairs, so one shape covers them. */
export type Pair = { user_id: number; bathroom_id: number };
export type FollowPair = { follower_id: number; followee_id: number };

export type MockState = {
  users: DemoUser[];
  /** The catalogue. Nothing in the app may push onto this, see CLAUDE.md. */
  bathrooms: BathroomRow[];
  reviews: ReviewRow[];
  follows: FollowPair[];
  bookmarks: Pair[];
  wantToGo: Pair[];
};

/** Who the mock client signs you in as when nothing is stored yet. */
export const DEFAULT_USER_ID = DEMO_CURRENT_USER_ID;

/**
 * A fresh deep copy of every fixture. Called once when `client.ts` loads; call it
 * again from a test to get a clean slate without reloading the page.
 */
export function freshState(): MockState {
  return {
    users: DEMO_USERS.map(u => ({ ...u })),
    bathrooms: CATALOGUE.map(b => ({ ...b })),
    reviews: demoReviews(),
    follows: DEMO_FOLLOWS.map(([follower_id, followee_id]) => ({ follower_id, followee_id })),
    bookmarks: DEMO_BOOKMARKS.map(([user_id, bathroom_id]) => ({ user_id, bathroom_id })),
    wantToGo: DEMO_WANT_TO_GO.map(([user_id, bathroom_id]) => ({ user_id, bathroom_id })),
  };
}
