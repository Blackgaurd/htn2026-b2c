/**
 * The comparison duel — the thing that actually produces a score.
 *
 * A fresh review arrives with a bucket but no place inside it. Rather than asking
 * the user to rank against everything, we binary-search: ask about the middle of
 * the remaining range, and each answer halves it. Seven previous reviews in a
 * bucket costs three taps, not seven.
 *
 * Pure, synchronous and state-free by design — the screen holds a `Duel` in
 * `useState` and the API never hears about the intermediate steps. All the server
 * ever receives is the final `duelPosition()`.
 */

import type { Bathroom, Bucket, RankedBathroom, Rating, ReviewDetails } from "../../shared/api";

/**
 * A review that has been filled in but not yet placed. It exists only while the
 * user is walking the flow: rate → bucket → duel → submit. Nothing persists it.
 */
export type ReviewDraft = {
  bathroom: Bathroom;
  rating: Rating;
  /** Optional per-aspect ratings. Carried along; never used to compute a score. */
  details: ReviewDetails;
  photos: string[];
  note: string | null;
  /** Always `bucketForRating(rating)` — carried so the duel needn't recompute it. */
  bucket: Bucket;
};

export type Duel = {
  /** Candidates in this bucket, best first. The search never leaves the bucket. */
  opponents: RankedBathroom[];
  /** Live search window: the answer is somewhere in `[lo, hi]`. */
  lo: number;
  hi: number;
  /** How many questions have been answered, for the progress dots. */
  asked: number;
};

export function startDuel(opponents: RankedBathroom[]): Duel {
  return { opponents, lo: 0, hi: opponents.length, asked: 0 };
}

/** The bathroom to hold the new one up against, or `null` when the answer is known. */
export function duelOpponent(duel: Duel): RankedBathroom | null {
  if (duel.lo >= duel.hi) return null;
  return duel.opponents[Math.floor((duel.lo + duel.hi) / 2)] ?? null;
}

/** Record an answer. `newIsBetter` means the user picked the bathroom being rated. */
export function answerDuel(duel: Duel, newIsBetter: boolean): Duel {
  const mid = Math.floor((duel.lo + duel.hi) / 2);
  return newIsBetter
    ? { ...duel, hi: mid, asked: duel.asked + 1 }
    : { ...duel, lo: mid + 1, asked: duel.asked + 1 };
}

export const duelDone = (duel: Duel): boolean => duel.lo >= duel.hi;

/** Where it landed: 0-based, best first, ready for `submitReview`. */
export const duelPosition = (duel: Duel): number => duel.lo;

/**
 * Worst-case questions left, so the progress dots can be drawn up front. The
 * window halves each round, so it's the log of the range — never more than one
 * extra dot appears.
 */
export function duelRoundsLeft(duel: Duel): number {
  return Math.ceil(Math.log2(Math.max(duel.hi - duel.lo, 0) + 1));
}

/** Total dots to draw: what's been asked plus what's still coming. */
export const duelTotalRounds = (duel: Duel): number => duel.asked + duelRoundsLeft(duel);

/**
 * Stops the duel early. The user skipped, so drop it at the bottom of whatever
 * window is left rather than pretending we learned something.
 */
export const skipDuel = (duel: Duel): Duel => ({ ...duel, lo: duel.hi });
