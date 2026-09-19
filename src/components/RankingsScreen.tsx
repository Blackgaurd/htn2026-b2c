/**
 * My list — every bathroom you've rated, best first.
 *
 * There's no podium and no medals. The list is already ordered by score, so a
 * three-column trophy stand above it restated the top three in a second visual
 * language and pushed the actual list below the fold. Rank is a number in a
 * column, the same for #1 as for #12.
 *
 * There's also no sort control, because there's only one thing to sort by. One
 * score per bathroom means the order is the order.
 */

import { useState } from "react";
import type { Bathroom, RankedBathroom } from "../../shared/api";
import { listMyRankings } from "../api";
import { locationOf, palette } from "../lib/display";
import { useAsync } from "../lib/useAsync";
import { EmptyState, LoadingScreen, Notice, ScoreChip, WashroomBadge } from "./chrome";

export function RankingsScreen({ onOpen }: { onOpen: (bathroom: Bathroom) => void }) {
  const rankings = useAsync(() => listMyRankings(), []);

  if (rankings.loading && !rankings.data) return <LoadingScreen />;

  const ranked = rankings.data ?? [];

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="px-5 pb-3 pt-14">
        <h1 style={{ fontSize: 24, fontWeight: 800, color: palette.charcoal }}>My Rankings</h1>
        <p style={{ fontSize: 13, color: palette.muted }}>
          {ranked.length} rated, best first
        </p>
      </div>

      <div className="phone-scroll flex-1 overflow-y-auto px-5 pb-4">
        {rankings.error && <Notice tone="error">{rankings.error}</Notice>}

        {ranked.length === 0 ? (
          <EmptyState
            title="No rankings yet"
            body="Rate your first bathroom and it'll land here. After that, every new one gets compared against this list."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {ranked.map(entry => (
              <RankedRow key={entry.review_id} entry={entry} onPress={() => onOpen(entry.bathroom)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RankedRow({ entry, onPress }: { entry: RankedBathroom; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      className="flex items-start gap-3 rounded-2xl px-4 py-3.5 text-left active:scale-[0.99]"
      style={{ background: "white", boxShadow: "0 1px 4px #0000000A" }}
    >
      <div
        className="flex flex-shrink-0 items-center justify-center"
        style={{ width: 26, fontSize: 14, fontWeight: 700, color: palette.faint, paddingTop: 2 }}
      >
        {entry.rank}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1">
          <WashroomBadge type={entry.bathroom.washroom_type} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: palette.charcoal, lineHeight: 1.35 }}>
          {locationOf(entry.bathroom)}
        </div>
      </div>

      <ScoreChip score={entry.score} />
    </button>
  );
}
