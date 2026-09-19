/**
 * My list — the payoff screen.
 *
 * Every score here came out of a duel, so the order *is* the data. Re-sorting by a
 * category is a different view of the same reviews, not a different ranking: the
 * medal positions only ever follow the score.
 *
 * Want-to-go lives here as the second tab because it's the same list one step
 * earlier — bathrooms you mean to rate but haven't.
 */

import { useMemo, useState } from "react";
import type { Bathroom, RankedBathroom, RatingCategory } from "../../shared/api";
import { listMyRankings, listWantToGo, setWantToGo } from "../api";
import { buildingColor, categoryMeta, palette, scoreColor, washroomMeta } from "../lib/display";
import { useAsync } from "../lib/useAsync";
import { BathroomRow, EmptyState, LoadingScreen, Notice, ScoreChip, Segmented, WashroomBadge } from "./chrome";
import { ChevronDownIcon } from "./icons";

type SortKey = "score" | RatingCategory;
type Tab = "ranked" | "want";

const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
  { key: "score", label: "Overall Score", icon: "⭐" },
  ...categoryMeta.map(c => ({ key: c.key as SortKey, label: c.label, icon: c.icon })),
];

const MEDALS = ["🥇", "🥈", "🥉"];
const MEDAL_COLORS = ["#F5A623", "#ADADBE", "#CD7F32"];

export function RankingsScreen({ onOpen, onRate }: { onOpen: (bathroom: Bathroom) => void; onRate: () => void }) {
  const [tab, setTab] = useState<Tab>("ranked");
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [menuOpen, setMenuOpen] = useState(false);

  const rankings = useAsync(() => listMyRankings(), []);
  const wantToGo = useAsync(() => listWantToGo(), []);

  const sorted = useMemo(() => {
    const rows = [...(rankings.data ?? [])];
    if (sortBy === "score") return rows.sort((a, b) => a.rank - b.rank);
    return rows.sort((a, b) => b.ratings[sortBy] - a.ratings[sortBy] || a.rank - b.rank);
  }, [rankings.data, sortBy]);

  const active = SORT_OPTIONS.find(option => option.key === sortBy) ?? SORT_OPTIONS[0]!;

  if (rankings.loading && !rankings.data) return <LoadingScreen />;

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="px-5 pb-3 pt-14">
        <div className="mb-1 flex items-center justify-between">
          <h1 style={{ fontSize: 24, fontWeight: 800, color: palette.charcoal }}>My Rankings</h1>
          {tab === "ranked" && (
            <button
              onClick={() => setMenuOpen(open => !open)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all active:opacity-70"
              style={{
                background: menuOpen ? palette.periwinkleLight : "white",
                border: `1.5px solid ${menuOpen ? palette.periwinkle : palette.border}`,
              }}
            >
              <span style={{ fontSize: 14 }}>{active.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: palette.charcoal }}>{active.label}</span>
              <ChevronDownIcon open={menuOpen} />
            </button>
          )}
        </div>
        <p style={{ fontSize: 13, color: palette.muted }}>
          {(rankings.data ?? []).length} rated · {(wantToGo.data ?? []).length} to try
        </p>

        {menuOpen && tab === "ranked" && (
          <div
            className="mt-2 overflow-hidden rounded-2xl"
            style={{ background: "white", boxShadow: "0 8px 32px #00000015", border: `1px solid ${palette.border}` }}
          >
            {SORT_OPTIONS.map(option => (
              <button
                key={option.key}
                onClick={() => {
                  setSortBy(option.key);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 transition-colors"
                style={{
                  background: sortBy === option.key ? palette.periwinkleLight : "transparent",
                  borderBottom: `1px solid ${palette.border}`,
                }}
              >
                <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{option.icon}</span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: sortBy === option.key ? 700 : 500,
                    color: sortBy === option.key ? palette.periwinkle : palette.charcoal,
                  }}
                >
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-3">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { id: "ranked", label: "Ranked" },
              { id: "want", label: "Want to go" },
            ]}
          />
        </div>
      </div>

      <div className="phone-scroll flex-1 overflow-y-auto px-5 pb-4">
        {rankings.error && <Notice tone="error">{rankings.error}</Notice>}

        {tab === "ranked" ? (
          sorted.length === 0 ? (
            <EmptyState
              icon="🏆"
              title="No rankings yet"
              body="Rate your first bathroom and it'll land here. After that, every new one gets compared against this list."
            />
          ) : (
            <>
              {sortBy === "score" && sorted.length >= 3 && <Podium entries={sorted.slice(0, 3)} />}

              <div className="flex flex-col gap-2">
                {sorted.map((entry, index) => (
                  <RankedRow
                    key={entry.review_id}
                    entry={entry}
                    place={sortBy === "score" ? entry.rank : index + 1}
                    highlight={sortBy === "score" ? null : { icon: active.icon, value: entry.ratings[sortBy] * 2 }}
                    onPress={() => onOpen(entry.bathroom)}
                  />
                ))}
              </div>
            </>
          )
        ) : (
          <WantToGoList
            items={wantToGo.data ?? []}
            onOpen={onOpen}
            onRemove={async id => {
              await setWantToGo(id, false);
              wantToGo.reload();
            }}
            onRate={onRate}
          />
        )}
      </div>
    </div>
  );
}

function Podium({ entries }: { entries: RankedBathroom[] }) {
  const [second, first, third] = [entries[1], entries[0], entries[2]];
  const columns = [
    { entry: second, medal: MEDALS[1], color: MEDAL_COLORS[1]!, height: 40, big: false },
    { entry: first, medal: MEDALS[0], color: MEDAL_COLORS[0]!, height: 60, big: true },
    { entry: third, medal: MEDALS[2], color: MEDAL_COLORS[2]!, height: 28, big: false },
  ];

  return (
    <div className="mb-5">
      <div className="mb-1 flex items-end gap-3">
        {columns.map(column =>
          !column.entry ? null : (
            <div key={column.entry.review_id} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-2xl p-3 text-center"
                style={{
                  background: column.big ? "linear-gradient(135deg, #FFF8ED, #FFFBF0)" : "white",
                  border: `2px solid ${column.color}${column.big ? "66" : "33"}`,
                  boxShadow: column.big ? `0 4px 20px ${column.color}33` : "0 2px 12px #0000000A",
                }}
              >
                <div style={{ fontSize: column.big ? 26 : 22 }}>{column.medal}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: palette.charcoal, marginTop: 4 }}>
                  {column.entry.bathroom.building} F{column.entry.bathroom.floor}
                </div>
                <div className="mt-1 flex justify-center">
                  <WashroomBadge type={column.entry.bathroom.washroom_type} />
                </div>
                <div className="mt-2" style={{ fontSize: column.big ? 24 : 20, fontWeight: 800, color: column.color }}>
                  {column.entry.score.toFixed(1)}
                </div>
              </div>
              <div style={{ height: column.height, width: "70%", borderRadius: "8px 8px 0 0", background: `${column.color}44` }} />
            </div>
          ),
        )}
      </div>
      <div style={{ height: 4, background: palette.border, borderRadius: 2 }} />
    </div>
  );
}

function RankedRow({
  entry,
  place,
  highlight,
  onPress,
}: {
  entry: RankedBathroom;
  place: number;
  highlight: { icon: string; value: number } | null;
  onPress: () => void;
}) {
  const isTop3 = place <= 3;
  return (
    <button
      onClick={onPress}
      className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left active:scale-[0.99]"
      style={{
        background: "white",
        border: isTop3 ? `1.5px solid ${MEDAL_COLORS[place - 1]}33` : "1.5px solid transparent",
        boxShadow: "0 1px 4px #0000000A",
      }}
    >
      <div
        className="flex flex-shrink-0 items-center justify-center"
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          background: isTop3 ? `${MEDAL_COLORS[place - 1]}22` : "#F5F4F0",
          fontSize: isTop3 ? 16 : 13,
          fontWeight: 800,
          color: isTop3 ? MEDAL_COLORS[place - 1] : palette.muted,
        }}
      >
        {isTop3 ? MEDALS[place - 1] : place}
      </div>

      <div
        className="flex flex-shrink-0 items-center justify-center rounded-lg"
        style={{
          width: 34,
          height: 34,
          background: `${buildingColor(entry.bathroom.building)}20`,
          color: buildingColor(entry.bathroom.building),
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {entry.bathroom.building}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: palette.charcoal }}>
          {entry.bathroom.location}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span style={{ fontSize: 11, color: palette.muted }}>F{entry.bathroom.floor}</span>
          <WashroomBadge type={entry.bathroom.washroom_type} />
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <ScoreChip score={entry.score} />
        {highlight && (
          <span style={{ fontSize: 10, fontWeight: 600, color: scoreColor(highlight.value) }}>
            {highlight.icon} {highlight.value.toFixed(1)}
          </span>
        )}
      </div>
    </button>
  );
}

function WantToGoList({
  items,
  onOpen,
  onRemove,
  onRate,
}: {
  items: Bathroom[];
  onOpen: (bathroom: Bathroom) => void;
  onRemove: (id: number) => void;
  onRate: () => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon="🚩"
        title="Nothing on the list"
        body="Found a bathroom you mean to try? Open it and tap 'Add to want-to-go' — it'll wait here until you rate it."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {items.map(bathroom => (
        <div key={bathroom.id} className="relative">
          <BathroomRow
            bathroom={bathroom}
            onPress={() => onOpen(bathroom)}
            trailing={<ScoreChip score={bathroom.global_score} label="Not rated" />}
          />
          <button
            onClick={() => onRemove(bathroom.id)}
            className="absolute right-3 top-2 active:opacity-60"
            style={{ fontSize: 11, fontWeight: 600, color: palette.faint }}
          >
            Remove
          </button>
        </div>
      ))}
      <button onClick={onRate} className="py-3" style={{ fontSize: 14, fontWeight: 600, color: palette.periwinkle }}>
        Rate one of them →
      </button>
    </div>
  );
}
