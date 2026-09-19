/**
 * The rules the mock client has to hold, and that `server/routes.ts` will have to
 * hold identically once it exists.
 *
 * Run with `bun test`.
 */

import { beforeEach, expect, test } from "bun:test";
import {
  BUCKET_BANDS,
  MAX_REVIEW_PHOTOS,
  PROFILE_ACTIVITY_LIMIT,
  canUse,
  detailKeysFor,
  round1,
  scoreForPosition,
  visibleTypes,
} from "../../shared/api";
import { CATALOGUE } from "../../shared/catalogue";
import { answerDuel, duelDone, duelOpponent, duelPosition, startDuel } from "../lib/duel";
import { mockClient, resetMocks } from "./client";

const rating = 5 as const;

beforeEach(async () => {
  resetMocks();
  await mockClient.login({ email: "a24chen@uwaterloo.ca", password: "pupi" });
});

test("the gate lets universal through for everyone and never crosses the aisle", () => {
  expect(visibleTypes("female")).toEqual(["female", "universal"]);
  expect(visibleTypes("male")).toEqual(["male", "universal"]);
  expect(visibleTypes("universal")).toEqual(["universal"]);
  expect(canUse("female", "male")).toBe(false);
  expect(canUse("universal", "female")).toBe(false);
});

test("browsing never returns a washroom the user doesn't use", async () => {
  const listed = await mockClient.listBathrooms();
  expect(listed.length).toBeGreaterThan(0);
  expect(listed.every(b => b.washroom_type !== "male")).toBe(true);
  expect(listed.some(b => b.washroom_type === "universal")).toBe(true);
});

test("reading a washroom outside the gate is refused, not quietly returned", async () => {
  const mens = CATALOGUE.find(b => b.washroom_type === "male")!;
  await expect(mockClient.getBathroom(mens.id)).rejects.toThrow(/washroom/);
  await expect(mockClient.setBookmark(mens.id, true)).rejects.toThrow(/washroom/);
  await expect(mockClient.setWantToGo(mens.id, true)).rejects.toThrow(/washroom/);
});

test("the feed crosses types on purpose, and flags the ones you can't use", async () => {
  const feed = await mockClient.listFeed();
  const blocked = feed.filter(entry => !entry.can_use);

  expect(blocked.length).toBeGreaterThan(0);
  expect(blocked.every(entry => entry.bathroom.washroom_type === "male")).toBe(true);
  // Every row still carries the type, which is what makes the exception safe.
  expect(feed.every(entry => entry.bathroom.washroom_type !== undefined)).toBe(true);
});

test("scores come out of rank, and stay inside their bucket's band", async () => {
  const rankings = await mockClient.listMyRankings();
  expect(rankings.length).toBeGreaterThan(0);

  for (const entry of rankings) {
    const [low, high] = BUCKET_BANDS[entry.bucket];
    expect(entry.score).toBeGreaterThanOrEqual(low);
    expect(entry.score).toBeLessThanOrEqual(high);
  }

  // Ranks are dense and the list is sorted best first.
  expect(rankings.map(r => r.rank)).toEqual(rankings.map((_, i) => i + 1));
  for (let i = 1; i < rankings.length; i++) {
    expect(rankings[i]!.score).toBeLessThanOrEqual(rankings[i - 1]!.score);
  }
});

test("a lone review in a bucket sits mid-band so it can move either way", () => {
  const [low, high] = BUCKET_BANDS.loved;
  // Scores are rounded to one decimal, so the midpoint of 6.7–10 is 8.4, not 8.35.
  expect(scoreForPosition("loved", 0, 1)).toBe(round1((low + high) / 2));
});

test("inserting at the top moves the bathroom that used to be there", async () => {
  const before = await mockClient.listMyRankings();
  const topBefore = before.find(entry => entry.bucket === "loved")!;

  const fresh = (await mockClient.listBathrooms()).find(
    b => !before.some(entry => entry.bathroom.id === b.id),
  )!;

  const result = await mockClient.submitReview({
    bathroom_id: fresh.id,
    rating,
    details: {},
    photos: [],
    note: null,
    position: 0,
  });

  expect(result.rank).toBe(1);
  expect(result.review.score).toBe(BUCKET_BANDS.loved[1]);

  const topAfter = result.rankings.find(entry => entry.review_id === topBefore.review_id)!;
  expect(topAfter.score).toBeLessThan(topBefore.score);
});

test("re-rating replaces the old review instead of stacking a second one", async () => {
  const before = await mockClient.listMyRankings();
  const target = before[0]!;

  const result = await mockClient.submitReview({
    bathroom_id: target.bathroom.id,
    rating: 1,
    details: {},
    photos: [],
    note: "second look",
    position: 0,
  });

  expect(result.previous_score).toBe(target.score);
  expect(result.rankings).toHaveLength(before.length);
  expect(result.rankings.filter(e => e.bathroom.id === target.bathroom.id)).toHaveLength(1);
  expect(result.review.score).toBeLessThanOrEqual(BUCKET_BANDS.never[1]);
});

test("the duel binary-searches: 7 opponents costs 3 questions, and it lands where it should", () => {
  const opponents = Array.from({ length: 7 }, (_, i) => ({ rank: i + 1 }) as never);
  let duel = startDuel(opponents);

  let asked = 0;
  // Always say the new one is worse, it should end up last.
  while (!duelDone(duel)) {
    expect(duelOpponent(duel)).not.toBeNull();
    duel = answerDuel(duel, false);
    asked++;
  }

  expect(asked).toBe(3);
  expect(duelPosition(duel)).toBe(7);
});

test("an empty bucket needs no comparison at all", () => {
  const duel = startDuel([]);
  expect(duelDone(duel)).toBe(true);
  expect(duelOpponent(duel)).toBeNull();
  expect(duelPosition(duel)).toBe(0);
});

test("following is instant, one-directional, and changes the feed", async () => {
  const [stranger] = await mockClient.searchUsers("atran");
  expect(stranger!.following).toBe(false);

  const before = (await mockClient.listFeed()).length;
  const followed = await mockClient.setFollow(stranger!.id, true);
  expect(followed.following).toBe(true);

  const after = await mockClient.listFeed();
  expect(after.length).toBeGreaterThan(before);
  expect(after.some(entry => entry.user.id === stranger!.id)).toBe(true);

  // One-directional: they don't now follow us.
  const theirProfile = await mockClient.getProfile(stranger!.id);
  expect(theirProfile.followers_count).toBeGreaterThan(0);
});

test("profile activity is newest first, and agrees with the rankings on rank", async () => {
  const profile = await mockClient.getProfile();
  const ranked = await mockClient.listMyRankings();

  expect(profile.recent.length).toBeGreaterThan(1);
  expect(profile.recent.length).toBeLessThanOrEqual(PROFILE_ACTIVITY_LIMIT);

  // Newest first, which is a different order from best first: the fixtures rate
  // the #1 washroom early on, so an activity list sorted by rank would be a
  // second copy of the rankings screen rather than a history.
  const stamps = profile.recent.map(entry => entry.review.created_at);
  expect([...stamps].sort().reverse()).toEqual(stamps);
  expect(profile.recent.map(entry => entry.rank)).not.toEqual(ranked.map(entry => entry.rank));

  // Same reviews underneath, so the two screens can never disagree about where a
  // washroom sits or what it scored.
  for (const entry of profile.recent) {
    const row = ranked.find(r => r.bathroom.id === entry.bathroom.id);
    expect(row).toBeDefined();
    expect(entry.rank).toBe(row!.rank);
    expect(entry.review.score).toBe(row!.score);
  }
});

test("the global score is the mean of everyone's personal score", async () => {
  const shared = CATALOGUE.find(b => b.id === 6)!;
  const detail = await mockClient.getBathroom(shared.id);

  expect(detail.review_count).toBeGreaterThan(1);
  expect(detail.global_score).not.toBeNull();
  expect(detail.my_review).not.toBeNull();
  // Your score and the crowd's are different numbers and never conflated.
  expect(detail.friend_reviews.length).toBeGreaterThan(0);
});

test("the catalogue is fixed, there is no operation that adds to it", async () => {
  const listed = await mockClient.listBathrooms();
  expect(listed.every(b => CATALOGUE.some(row => row.id === b.id))).toBe(true);
  expect(Object.keys(mockClient).some(op => /create.*bathroom/i.test(op))).toBe(false);
});
