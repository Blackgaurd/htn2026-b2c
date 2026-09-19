/**
 * Near me, the best washrooms within reach, closest buildings first.
 *
 * Distance is per *building*: every washroom in E7 is the same place to a GPS, and
 * floors don't move you on a map. So the list groups by how far the building is and
 * ranks within that by whichever score you asked for.
 *
 * Location is asked for, not assumed. A browser that refuses, or a laptop on a
 * demo table, falls back to picking the building you're in: the same information
 * arrived at by hand, and it keeps the screen useful instead of empty.
 *
 * One score at a time. The filter chooses which number the list is ranked by, so
 * printing the other one next to it invited the eye to rank by the column that
 * wasn't sorted.
 */

import { useMemo, useState } from "react";
import type { Bathroom, Building, RankedBathroom } from "../../shared/api";
import type { Coords } from "../../shared/geo";
import { BUILDING_COORDS, distanceMetres, formatDistance } from "../../shared/geo";
import { listBathrooms, listMyRankings } from "../api";
import { locationOf, palette } from "../lib/display";
import { useAsync } from "../lib/useAsync";
import { Chip, Dropdown, EmptyState, LoadingScreen, Notice, ScoreChip, WashroomBadge } from "./chrome";

type SortBy = "average" | "mine";
type Located = { kind: "coords"; coords: Coords } | { kind: "building"; building: Building } | null;

export function NearMeScreen({ onOpen }: { onOpen: (bathroom: Bathroom) => void }) {
  const [sortBy, setSortBy] = useState<SortBy>("average");
  const [located, setLocated] = useState<Located>(null);
  const [asking, setAsking] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const bathrooms = useAsync(() => listBathrooms(), []);
  const rankings = useAsync(() => listMyRankings(), []);

  const myScores = useMemo(() => {
    const map = new Map<number, RankedBathroom>();
    for (const entry of rankings.data ?? []) map.set(entry.bathroom.id, entry);
    return map;
  }, [rankings.data]);

  function askForLocation() {
    setLocationError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("This browser can't share a location.");
      return;
    }
    setAsking(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        setAsking(false);
        setLocated({
          kind: "coords",
          coords: { lat: position.coords.latitude, lng: position.coords.longitude },
        });
      },
      () => {
        setAsking(false);
        setLocationError("Couldn't get your location. Pick a building instead.");
      },
      { timeout: 8000 },
    );
  }

  /** Metres from wherever we reckon the user is, or `null` if we don't know. */
  function distanceTo(building: Building): number | null {
    if (!located) return null;
    if (located.kind === "building") return located.building === building ? 0 : null;
    const target = BUILDING_COORDS[building];
    return target ? distanceMetres(located.coords, target) : null;
  }

  const scoreOf = (bathroom: Bathroom) =>
    sortBy === "mine" ? (myScores.get(bathroom.id)?.score ?? null) : bathroom.global_score;

  const listed = useMemo(() => {
    const rows = (bathrooms.data ?? []).map(bathroom => ({
      bathroom,
      distance: distanceTo(bathroom.building),
      score: scoreOf(bathroom),
    }));

    return rows.sort((a, b) => {
      // Unknown distance sorts last, unrated sorts last within a distance.
      const da = a.distance ?? Number.POSITIVE_INFINITY;
      const db = b.distance ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return (b.score ?? -1) - (a.score ?? -1);
    });
  }, [bathrooms.data, located, sortBy, myScores]);

  if (bathrooms.loading && !bathrooms.data) return <LoadingScreen />;

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="px-5 pb-3 pt-14">
        <h1 style={{ fontSize: 24, fontWeight: 800, color: palette.charcoal }}>Near me</h1>

        <div className="mt-3 flex items-center gap-2">
          <span style={{ fontSize: 12, fontWeight: 600, color: palette.muted }}>Ranked by</span>
          <Dropdown
            label="Rank washrooms by"
            value={sortBy}
            onChange={setSortBy}
            options={[
              { id: "average", label: "Campus average" },
              { id: "mine", label: "My score" },
            ]}
          />
        </div>

        {!located && (
          <div className="mt-3 rounded-2xl p-4" style={{ background: "white" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: palette.charcoal }}>Where are you?</div>
            <p style={{ fontSize: 12, color: palette.muted, marginTop: 2, lineHeight: 1.45 }}>
              Used on this device only, to sort by how far each building is.
            </p>

            <button
              onClick={askForLocation}
              disabled={asking}
              className="mt-3 w-full py-2.5 active:opacity-80"
              style={{
                borderRadius: 12,
                background: palette.periwinkle,
                color: "white",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {asking ? "Locating…" : "Use my location"}
            </button>

            <div className="mt-3 flex items-center gap-2">
              <span style={{ fontSize: 12, color: palette.faint }}>or I'm in</span>
              {(Object.keys(BUILDING_COORDS) as Building[]).map(building => (
                <Chip key={building} active={false} onClick={() => setLocated({ kind: "building", building })}>
                  {building}
                </Chip>
              ))}
            </div>

            {locationError && (
              <p style={{ fontSize: 12, color: "#D2544F", marginTop: 8 }}>{locationError}</p>
            )}
          </div>
        )}

        {located && (
          <button
            onClick={() => setLocated(null)}
            className="mt-3 active:opacity-70"
            style={{ fontSize: 12, fontWeight: 600, color: palette.periwinkle }}
          >
            {located.kind === "building" ? `In ${located.building}` : "Using your location"} · change
          </button>
        )}
      </div>

      <div className="phone-scroll flex-1 overflow-y-auto px-5 pb-4">
        {bathrooms.error && <Notice tone="error">{bathrooms.error}</Notice>}

        {listed.length === 0 ? (
          <EmptyState title="Nothing to show" body="No washrooms match your preference yet." />
        ) : (
          <div className="flex flex-col gap-2.5">
            {listed.map(({ bathroom, distance, score }) => (
              <button
                key={bathroom.id}
                onClick={() => onOpen(bathroom)}
                className="flex w-full items-start gap-3 px-4 py-3.5 text-left active:scale-[0.99]"
                style={{ background: "white", borderRadius: 16, boxShadow: "0 1px 4px #0000000A" }}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <WashroomBadge type={bathroom.washroom_type} />
                    {distance !== null && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: palette.faint }}>
                        {distance === 0 ? "This building" : formatDistance(distance)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: palette.charcoal, lineHeight: 1.35 }}>
                    {locationOf(bathroom)}
                  </div>
                </div>
                <ScoreChip score={score} label={sortBy === "mine" ? "Not rated" : "No ratings"} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
