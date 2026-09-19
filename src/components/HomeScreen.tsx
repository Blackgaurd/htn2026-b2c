/**
 * Browse — the catalogue, already gender-filtered by the API.
 *
 * Note what this screen does NOT do: it never checks `washroom_pref` itself.
 * `listBathrooms()` returns what this user is allowed to see and nothing else, so
 * there is no filter here to forget.
 *
 * Each row shows your score when you have one, and the crowd's when you don't —
 * the two are never the same number and are never presented as if they were.
 */

import { useMemo, useState } from "react";
import type { Bathroom, RankedBathroom, User } from "../../shared/api";
import { listBathrooms, listMyRankings } from "../api";
import { CATALOGUE_FLOORS } from "../../shared/catalogue";
import { locationOf, palette } from "../lib/display";
import { useAsync } from "../lib/useAsync";
import { BathroomRow, Chip, LoadingScreen, Notice, ScoreChip, SearchField } from "./chrome";

type Sort = "score" | "location";

export function HomeScreen({ user, onOpen }: { user: User; onOpen: (bathroom: Bathroom) => void }) {
  const [search, setSearch] = useState("");
  const [building, setBuilding] = useState<"all" | "E5" | "E7">("all");
  const [floor, setFloor] = useState<number | null>(null);
  const [sort, setSort] = useState<Sort>("score");

  const bathrooms = useAsync(() => listBathrooms(), []);
  const rankings = useAsync(() => listMyRankings(), []);

  const myScores = useMemo(() => {
    const map = new Map<number, RankedBathroom>();
    for (const entry of rankings.data ?? []) map.set(entry.bathroom.id, entry);
    return map;
  }, [rankings.data]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = (bathrooms.data ?? []).filter(b => {
      if (building !== "all" && b.building !== building) return false;
      if (floor !== null && b.floor !== floor) return false;
      if (query && !locationOf(b).toLowerCase().includes(query)) return false;
      return true;
    });

    return rows.sort((a, b) => {
      if (sort === "location") return 0; // listBathrooms already returns building/floor order
      const left = myScores.get(a.id)?.score ?? a.global_score ?? -1;
      const right = myScores.get(b.id)?.score ?? b.global_score ?? -1;
      return right - left;
    });
  }, [bathrooms.data, building, floor, search, sort, myScores]);

  const rated = rankings.data ?? [];
  const average = rated.length
    ? (rated.reduce((sum, entry) => sum + entry.score, 0) / rated.length).toFixed(1)
    : "—";

  if (bathrooms.loading && !bathrooms.data) return <LoadingScreen />;

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="px-5 pb-4 pt-14">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p style={{ color: palette.muted, fontSize: 13, fontWeight: 500 }}>
              {greeting()}, {user.display_name.split(" ")[0]} 👋
            </p>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: palette.charcoal, letterSpacing: "-0.5px", marginTop: 2 }}>
              p<span style={{ color: palette.periwinkle }}>ü</span>pi
            </h1>
          </div>
          <div className="flex gap-2">
            <Stat value={String(rated.length)} label="Rated" color={palette.periwinkle} />
            <Stat value={average} label="Your avg" color="#3DBF82" />
          </div>
        </div>

        <SearchField value={search} onChange={setSearch} placeholder="Search bathrooms..." />

        <div className="phone-scroll mt-3 flex gap-2 overflow-x-auto pb-1">
          {(["all", "E5", "E7"] as const).map(option => (
            <Chip key={option} active={building === option} onClick={() => setBuilding(option)}>
              {option === "all" ? "All" : option}
            </Chip>
          ))}
          <div style={{ width: 1, background: palette.border, margin: "4px 0", flexShrink: 0 }} />
          {CATALOGUE_FLOORS.map(level => (
            <Chip
              key={level}
              active={floor === level}
              activeColor={palette.charcoal}
              onClick={() => setFloor(floor === level ? null : level)}
            >
              F{level}
            </Chip>
          ))}
        </div>
      </div>

      <div className="phone-scroll flex-1 overflow-y-auto px-5 pb-4">
        {bathrooms.error && <Notice tone="error">{bathrooms.error}</Notice>}

        <div className="mb-3 flex items-center justify-between">
          <span style={{ fontSize: 13, fontWeight: 600, color: palette.muted }}>
            {filtered.length} bathroom{filtered.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={() => setSort(sort === "score" ? "location" : "score")}
            style={{ fontSize: 13, fontWeight: 600, color: palette.periwinkle }}
          >
            {sort === "score" ? "Sort by score ↓" : "Sort by floor ↓"}
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {filtered.map(bathroom => {
            const mine = myScores.get(bathroom.id);
            return (
              <BathroomRow
                key={bathroom.id}
                bathroom={bathroom}
                onPress={() => onOpen(bathroom)}
                trailing={
                  <div className="flex flex-col items-end gap-0.5">
                    <ScoreChip score={mine?.score ?? bathroom.global_score} />
                    <span style={{ fontSize: 9, fontWeight: 600, color: palette.faint, letterSpacing: "0.04em" }}>
                      {mine ? "YOUR SCORE" : bathroom.global_score === null ? "" : `AVG · ${bathroom.review_count}`}
                    </span>
                  </div>
                }
              />
            );
          })}
        </div>

        {filtered.length === 0 && !bathrooms.loading && (
          <p className="py-10 text-center" style={{ color: palette.muted, fontSize: 13 }}>
            Nothing matches that. Try clearing a filter.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="rounded-2xl px-3 py-2 text-center" style={{ background: "white", boxShadow: "0 2px 8px #0000000A" }}>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: palette.muted, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
