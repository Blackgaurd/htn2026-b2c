/**
 * Near me, the best washrooms within reach, closest buildings first.
 *
 * Distance is per *building*: every washroom in E7 is the same place to a GPS, and
 * floors don't move you on a map. So the list groups by how far the building is and
 * ranks within that by whichever score you asked for.
 *
 * Location is asked for, not assumed. A browser that refuses, or a laptop on a
 * demo table, reports the problem and leaves the list in its normal order rather
 * than pretending it knows where you are.
 *
 * The rows are `BathroomTile`, the same one every other list uses, so both scores
 * are printed and labelled. The dropdown chooses which of them the list is
 * *sorted* by; hiding the other one to make that unambiguous cost more than the
 * ambiguity did, since the labels say which is which.
 */

import { useMemo, useState } from "react";
import type { Bathroom, Building, RankedBathroom } from "../../shared/api";
import type { Coords } from "../../shared/geo";
import { BUILDING_COORDS, distanceMetres, formatDistance } from "../../shared/geo";
import { listBathrooms, listMyRankings } from "../api";
import { palette } from "../lib/display";
import { useAsync } from "../lib/useAsync";
import { useBookmark } from "../lib/useBookmark";
import { BathroomTile, Dropdown, EmptyState, LoadingScreen, Notice } from "./chrome";

type SortBy = "average" | "mine";
type Located = { kind: "coords"; coords: Coords } | null;

export function NearMeScreen({ onOpen }: { onOpen: (bathroom: Bathroom) => void }) {
  const [sortBy, setSortBy] = useState<SortBy>("average");
  const [located, setLocated] = useState<Located>(null);
  const [asking, setAsking] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const bathrooms = useAsync(() => listBathrooms(), []);
  const rankings = useAsync(() => listMyRankings(), []);
  const bookmark = useBookmark(bathrooms.reload);

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
        setLocationError("Couldn't get your location. Try again when location sharing is available.");
      },
      { timeout: 8000 },
    );
  }

  /** Metres from wherever we reckon the user is, or `null` if we don't know. */
  function distanceTo(building: Building): number | null {
    if (!located) return null;
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

        {/*
          Where you are comes first, then what to rank by. The order is the order
          you answer them in: the list is meaningless until it knows where you're
          standing, and the sort is a refinement of a list that already exists.
        */}
        <div className="mt-3 rounded-2xl p-4" style={{ background: "white" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: palette.charcoal }}>Where are you?</div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={askForLocation}
              disabled={asking}
              className="flex-1 py-2.5 active:opacity-80"
              style={{
                borderRadius: 12,
                background: located?.kind === "coords" ? palette.periwinkle : "white",
                color: located?.kind === "coords" ? "white" : palette.muted,
                border: located?.kind === "coords" ? "none" : `1.5px solid ${palette.border}`,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {asking ? "Locating..." : "Use my location"}
            </button>

          </div>

          {locationError && <p style={{ fontSize: 12, color: "#D2544F", marginTop: 8 }}>{locationError}</p>}
        </div>

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
      </div>

      <div className="phone-scroll flex-1 overflow-y-auto px-5 pb-4">
        {bathrooms.error && <Notice tone="error">{bathrooms.error}</Notice>}
        {bookmark.error && <Notice tone="error">{bookmark.error}</Notice>}

        {listed.length === 0 ? (
          <EmptyState title="Nothing to show" body="No washrooms match your preference yet." />
        ) : (
          <div className="flex flex-col gap-2.5">
            {listed.map(({ bathroom, distance }) => (
              <BathroomTile
                key={bathroom.id}
                bathroom={bathroom}
                onPress={() => onOpen(bathroom)}
                mine={myScores.get(bathroom.id)?.score ?? null}
                meta={distance === null ? undefined : distance === 0 ? "This building" : formatDistance(distance)}
                details
                onToggleBookmark={() => bookmark.toggle(bathroom)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
