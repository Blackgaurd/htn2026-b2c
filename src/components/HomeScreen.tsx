/**
 * Home — the feed, with search layered over it.
 *
 * Search doesn't replace the page any more: results drop into a panel under the
 * field and the feed stays where it was, so looking something up doesn't cost you
 * your place. Tapping away, or clearing the field, puts it back.
 *
 * No building filter and no floor chips. Not every building has floors worth
 * filtering, and typing the name is faster than narrowing a list twice.
 */

import { useMemo, useState } from "react";
import type { Bathroom, RankedBathroom } from "../../shared/api";
import { listBathrooms, listFeed, listMyRankings } from "../api";
import { locationOf, palette } from "../lib/display";
import { useAsync } from "../lib/useAsync";
import { EmptyState, LoadingScreen, Notice, ScorePair, SearchField, WashroomBadge } from "./chrome";
import { FeedCard } from "./FeedCard";

const MAX_RESULTS = 6;

export function HomeScreen({
  onOpenBathroom,
  onOpenProfile,
  onFindPeople,
}: {
  onOpenBathroom: (bathroom: Bathroom | number) => void;
  onOpenProfile: (userId: number) => void;
  onFindPeople: () => void;
}) {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);

  const feed = useAsync(() => listFeed(), []);
  const bathrooms = useAsync(() => listBathrooms(), []);
  const rankings = useAsync(() => listMyRankings(), []);

  const myScores = useMemo(() => {
    const map = new Map<number, RankedBathroom>();
    for (const entry of rankings.data ?? []) map.set(entry.bathroom.id, entry);
    return map;
  }, [rankings.data]);

  const query = search.trim().toLowerCase();
  const results = useMemo(() => {
    if (!query) return [];
    return (bathrooms.data ?? []).filter(b => locationOf(b).toLowerCase().includes(query));
  }, [bathrooms.data, query]);

  const showResults = query.length > 0 && focused;

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="relative z-20 px-5 pb-3 pt-14">
        <h1 style={{ fontSize: 24, fontWeight: 800, color: palette.charcoal, letterSpacing: "-0.5px" }}>
          p<span style={{ color: palette.periwinkle }}>ü</span>pi
        </h1>

        <div className="mt-3">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search for a washroom..."
            onFocus={() => setFocused(true)}
          />
        </div>

        {showResults && (
          <>
            {/* Tap-away target, under the panel and over everything else. */}
            <button
              className="fixed inset-0 z-10 cursor-default"
              aria-label="Close search results"
              onClick={() => setFocused(false)}
            />
            <div
              className="phone-scroll absolute left-5 right-5 z-20 mt-2 overflow-y-auto"
              style={{
                maxHeight: 340,
                background: "white",
                borderRadius: 16,
                border: `1px solid ${palette.border}`,
                boxShadow: "0 12px 40px #00000022",
              }}
            >
              {results.length === 0 ? (
                <p className="px-4 py-6 text-center" style={{ color: palette.muted, fontSize: 13 }}>
                  No washrooms match that.
                </p>
              ) : (
                results.slice(0, MAX_RESULTS).map((bathroom, index) => (
                  <button
                    key={bathroom.id}
                    onClick={() => {
                      setFocused(false);
                      setSearch("");
                      onOpenBathroom(bathroom);
                    }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left active:opacity-70"
                    style={{ borderTop: index === 0 ? "none" : `1px solid ${palette.border}` }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1">
                        <WashroomBadge type={bathroom.washroom_type} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: palette.charcoal, lineHeight: 1.35 }}>
                        {locationOf(bathroom)}
                      </div>
                    </div>
                    <ScorePair mine={myScores.get(bathroom.id)?.score ?? null} average={bathroom.global_score} />
                  </button>
                ))
              )}
              {results.length > MAX_RESULTS && (
                <p className="px-4 py-2 text-center" style={{ color: palette.faint, fontSize: 11 }}>
                  +{results.length - MAX_RESULTS} more — keep typing
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <div className="phone-scroll flex-1 overflow-y-auto px-5 pb-4">
        {bathrooms.error && <Notice tone="error">{bathrooms.error}</Notice>}
        {feed.loading && !feed.data ? (
          <LoadingScreen />
        ) : (feed.data ?? []).length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            body="Follow a few people and what they rate shows up here."
            action={
              <button
                onClick={onFindPeople}
                className="w-full py-3"
                style={{ fontSize: 14, fontWeight: 700, color: palette.periwinkle }}
              >
                Find people to follow →
              </button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {feed.error && <Notice tone="error">{feed.error}</Notice>}
            {(feed.data ?? []).map(entry => (
              <FeedCard
                key={entry.review.id}
                entry={entry}
                onOpenBathroom={() => entry.can_use && onOpenBathroom(entry.bathroom.id)}
                onOpenProfile={() => onOpenProfile(entry.user.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
