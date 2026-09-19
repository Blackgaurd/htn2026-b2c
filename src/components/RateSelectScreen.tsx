/**
 * Step 1 of rating: pick the washroom.
 *
 * This is where the app's one hard rule lives — there's no "add a new bathroom"
 * affordance because there's no such operation. Search narrows the fixed
 * catalogue; it never offers to create what isn't in it.
 *
 * It no longer opens on the whole catalogue. A list of every washroom on campus
 * isn't a starting point, it's a wall, and scrolling it was never how anyone was
 * going to find the one they just used. There's also no floor filter: plenty of
 * buildings don't have floors worth filtering by, and typing beats narrowing twice.
 *
 * What fills the space instead is the shortlist you're most likely to want — what
 * the people you follow have been rating, minus the ones you've already done.
 */

import { useMemo, useState } from "react";
import type { Bathroom } from "../../shared/api";
import { listBathrooms, listFeed, listMyRankings } from "../api";
import { locationOf, palette } from "../lib/display";
import { useAsync } from "../lib/useAsync";
import { BackButton, LoadingScreen, Notice, ScorePair, SearchField, WashroomBadge } from "./chrome";

const MAX_SUGGESTIONS = 5;

export function RateSelectScreen({ onBack, onPick }: { onBack: () => void; onPick: (bathroom: Bathroom) => void }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Bathroom | null>(null);

  const bathrooms = useAsync(() => listBathrooms(), []);
  const rankings = useAsync(() => listMyRankings(), []);
  const feed = useAsync(() => listFeed(), []);

  const myScores = useMemo(
    () => new Map((rankings.data ?? []).map(entry => [entry.bathroom.id, entry.score])),
    [rankings.data],
  );

  const query = search.trim().toLowerCase();

  const results = useMemo(() => {
    if (!query) return [];
    return (bathrooms.data ?? []).filter(b => locationOf(b).toLowerCase().includes(query));
  }, [bathrooms.data, query]);

  // Newest first, de-duplicated, skipping anything you've already rated and
  // anything you can't use. `listFeed` is already ordered, so first wins.
  const suggestions = useMemo(() => {
    const seen = new Set<number>();
    const out: Bathroom[] = [];
    for (const entry of feed.data ?? []) {
      if (!entry.can_use) continue;
      if (myScores.has(entry.bathroom.id)) continue;
      if (seen.has(entry.bathroom.id)) continue;
      seen.add(entry.bathroom.id);
      out.push(entry.bathroom);
      if (out.length === MAX_SUGGESTIONS) break;
    }
    return out;
  }, [feed.data, myScores]);

  if (bathrooms.loading && !bathrooms.data) return <LoadingScreen />;

  const listed = query ? results : suggestions;

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="px-5 pb-4 pt-14">
        <div className="mb-4 flex items-center gap-3">
          <BackButton onClick={onBack} />
          <p
            className="flex-1 text-right"
            style={{ fontSize: 11, fontWeight: 700, color: palette.muted, letterSpacing: "0.08em" }}
          >
            STEP 1 OF 2
          </p>
        </div>

        <h1 className="mb-3" style={{ fontSize: 22, fontWeight: 800, color: palette.charcoal }}>
          Which washroom?
        </h1>

        <SearchField value={search} onChange={setSearch} placeholder="Search by building or room..." />
      </div>

      <div className="phone-scroll flex-1 overflow-y-auto px-5">
        {bathrooms.error && <Notice tone="error">{bathrooms.error}</Notice>}

        <p className="mb-3" style={{ fontSize: 12, fontWeight: 700, color: palette.faint, letterSpacing: "0.04em" }}>
          {query
            ? `${results.length} RESULT${results.length === 1 ? "" : "S"}`
            : suggestions.length > 0
              ? "RATED BY PEOPLE YOU FOLLOW"
              : ""}
        </p>

        <div className="flex flex-col gap-2.5 pb-4">
          {listed.map(bathroom => {
            const isSelected = selected?.id === bathroom.id;
            return (
              <button
                key={bathroom.id}
                onClick={() => setSelected(current => (current?.id === bathroom.id ? null : bathroom))}
                className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-all active:scale-[0.99]"
                style={{
                  background: isSelected ? palette.periwinkleLight : "white",
                  borderRadius: 16,
                  border: isSelected ? `2px solid ${palette.periwinkle}` : "2px solid transparent",
                  boxShadow: isSelected ? "0 4px 16px #7B8CDE22" : "0 1px 4px #0000000A",
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1">
                    <WashroomBadge type={bathroom.washroom_type} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: palette.charcoal, lineHeight: 1.35 }}>
                    {locationOf(bathroom)}
                  </div>
                </div>
                <ScorePair mine={myScores.get(bathroom.id) ?? null} average={bathroom.global_score} />
              </button>
            );
          })}
        </div>

        {listed.length === 0 && (
          <p className="py-8 text-center" style={{ color: palette.muted, fontSize: 13, lineHeight: 1.6 }}>
            {query
              ? "No washrooms match that."
              : "Search for the washroom you just used — by building, floor or room number."}
          </p>
        )}
      </div>

      <div className="px-5 pb-8 pt-4" style={{ background: palette.bg, borderTop: `1px solid ${palette.border}` }}>
        <button
          onClick={() => selected && onPick(selected)}
          disabled={!selected}
          className="w-full py-4 transition-all active:opacity-80"
          style={{
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 700,
            background: selected ? "linear-gradient(135deg, #7B8CDE 0%, #9B78D4 100%)" : palette.border,
            color: selected ? "white" : palette.faint,
            boxShadow: selected ? "0 4px 20px #7B8CDE44" : "none",
          }}
        >
          {selected ? "Continue →" : "Select a washroom to continue"}
        </button>
      </div>
    </div>
  );
}
