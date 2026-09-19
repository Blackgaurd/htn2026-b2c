/**
 * Step 1 of rating: pick the bathroom.
 *
 * This is the screen where the app's one hard rule lives. There is no "add a new
 * bathroom" affordance because there is no such operation — the catalogue is fixed
 * and `listBathrooms()` has already dropped everything outside your preference.
 * Search narrows the list; it never offers to create what isn't in it.
 */

import { useMemo, useState } from "react";
import type { Bathroom } from "../../shared/api";
import { CATALOGUE_FLOORS } from "../../shared/catalogue";
import { listBathrooms, listMyRankings } from "../api";
import { locationOf, palette } from "../lib/display";
import { useAsync } from "../lib/useAsync";
import { BathroomRow, BackButton, Chip, LoadingScreen, Notice, ScoreChip, SearchField } from "./chrome";

export function RateSelectScreen({ onBack, onPick }: { onBack: () => void; onPick: (bathroom: Bathroom) => void }) {
  const [search, setSearch] = useState("");
  const [building, setBuilding] = useState<"all" | "E5" | "E7">("all");
  const [floor, setFloor] = useState<number | null>(null);
  const [selected, setSelected] = useState<Bathroom | null>(null);

  const bathrooms = useAsync(() => listBathrooms(), []);
  const rankings = useAsync(() => listMyRankings(), []);

  const rated = useMemo(
    () => new Map((rankings.data ?? []).map(entry => [entry.bathroom.id, entry.score])),
    [rankings.data],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (bathrooms.data ?? []).filter(b => {
      if (building !== "all" && b.building !== building) return false;
      if (floor !== null && b.floor !== floor) return false;
      if (query && !locationOf(b).toLowerCase().includes(query)) return false;
      return true;
    });
  }, [bathrooms.data, building, floor, search]);

  if (bathrooms.loading && !bathrooms.data) return <LoadingScreen />;

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="px-5 pb-4 pt-14">
        <div className="mb-5 flex items-center gap-3">
          <BackButton onClick={onBack} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: palette.charcoal }}>Rate a Bathroom</h1>
            <p style={{ fontSize: 12, color: palette.muted }}>Step 1 of 2 — Choose from the list</p>
          </div>
        </div>

        <div style={{ height: 4, background: palette.border, borderRadius: 999, marginBottom: 16 }}>
          <div style={{ width: "50%", height: "100%", background: "linear-gradient(90deg, #7B8CDE, #9B78D4)", borderRadius: 999 }} />
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

      <div className="phone-scroll flex-1 overflow-y-auto px-5">
        {bathrooms.error && <Notice tone="error">{bathrooms.error}</Notice>}

        <div className="flex flex-col gap-2.5 pb-4">
          {filtered.map(bathroom => {
            const mine = rated.get(bathroom.id);
            return (
              <BathroomRow
                key={bathroom.id}
                bathroom={bathroom}
                selected={selected?.id === bathroom.id}
                onPress={() => setSelected(current => (current?.id === bathroom.id ? null : bathroom))}
                trailing={
                  mine === undefined ? (
                    <ScoreChip score={null} label="New" />
                  ) : (
                    <div className="flex flex-col items-end gap-0.5">
                      <ScoreChip score={mine} />
                      <span style={{ fontSize: 9, fontWeight: 600, color: palette.faint }}>RE-RATE</span>
                    </div>
                  )
                }
              />
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="py-10 text-center" style={{ color: palette.muted, fontSize: 13 }}>
            No bathrooms match that search.
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
          {selected ? `Rate "${selected.building} F${selected.floor}" →` : "Select a bathroom to continue"}
        </button>
      </div>
    </div>
  );
}
