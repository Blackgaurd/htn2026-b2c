/**
 * My list, every bathroom you've rated, best first.
 *
 * There's no podium and no medals. The list is already ordered by score, so a
 * three-column trophy stand above it restated the top three in a second visual
 * language and pushed the actual list below the fold. Rank is a number in a
 * column, the same for #1 as for #12.
 *
 * There's also no sort control, because there's only one thing to sort by. One
 * score per bathroom means the order is the order.
 */

import type { Bathroom } from "../../shared/api";
import { listMyRankings } from "../api";
import { palette } from "../lib/display";
import { useAsync } from "../lib/useAsync";
import { useBookmark } from "../lib/useBookmark";
import { BathroomTile, EmptyState, LoadingScreen, Notice } from "./chrome";

export function RankingsScreen({ onOpen }: { onOpen: (bathroom: Bathroom) => void }) {
  const rankings = useAsync(() => listMyRankings(), []);
  const bookmark = useBookmark(rankings.reload);

  if (rankings.loading && !rankings.data) return <LoadingScreen />;

  const ranked = rankings.data ?? [];

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="px-5 pb-3 pt-14">
        <h1 style={{ fontSize: 24, fontWeight: 800, color: palette.charcoal }}>My Rankings</h1>
      </div>

      <div className="phone-scroll flex-1 overflow-y-auto px-5 pb-4">
        {rankings.error && <Notice tone="error">{rankings.error}</Notice>}
        {bookmark.error && <Notice tone="error">{bookmark.error}</Notice>}

        {ranked.length === 0 ? (
          <EmptyState
            title="No rankings yet"
            body="Rate your first bathroom and it'll land here. After that, every new one gets compared against this list."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {ranked.map(entry => (
              <BathroomTile
                key={entry.review_id}
                bathroom={entry.bathroom}
                rank={entry.rank}
                mine={entry.score}
                onPress={() => onOpen(entry.bathroom)}
                onToggleBookmark={() => bookmark.toggle(entry.bathroom)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
