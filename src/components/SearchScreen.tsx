/**
 * Search: a screen, not a dropdown.
 *
 * The panel-over-the-feed version made the results feel provisional and left them
 * fighting the feed for the same pixels. A washroom search is a task with its own
 * screen: field at the top, results below, and nothing else on it.
 *
 * One screen serves two callers. From Home it opens a washroom; from the rate
 * button it picks one to review. Same list, same filtering, so there's no second
 * picker to keep in sync, and only `onPick` differs.
 *
 * Before you type it shows the washrooms you opened most recently. The whole
 * catalogue isn't a starting point, it's a wall, and a list of things you
 * searched for was one tap further from the room than a list of the rooms.
 */

import { useEffect, useMemo, useState } from "react";
import type { Bathroom, Building } from "../../shared/api";
import { listBathrooms, listMyRankings } from "../api";
import { locationOf, palette } from "../lib/display";
import { clearRecents, pushRecent, readRecents } from "../lib/recents";
import { useAsync } from "../lib/useAsync";
import { useBookmark } from "../lib/useBookmark";
import { BathroomTile, BackButton, Chip, LoadingScreen, Notice, SearchField } from "./chrome";

export function SearchScreen({
  title,
  onBack,
  onPick,
  picking,
}: {
  title: string;
  onBack: () => void;
  onPick: (bathroom: Bathroom) => void;
  /**
   * True when the screen is choosing a washroom to review rather than one to
   * open. The picker stays a list of names: campus detail averages and a
   * bookmark are answers to "which one is good", and you already know which one
   * you just used.
   */
  picking?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [floor, setFloor] = useState<number | null>(null);
  const [recentIds, setRecentIds] = useState<number[]>([]);

  const bathrooms = useAsync(() => listBathrooms(), []);
  const rankings = useAsync(() => listMyRankings(), []);
  const bookmark = useBookmark(bathrooms.reload);

  useEffect(() => setRecentIds(readRecents()), []);

  const myScores = useMemo(
    () => new Map((rankings.data ?? []).map(entry => [entry.bathroom.id, entry.score])),
    [rankings.data],
  );

  const query = search.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!query) return [];
    return (bathrooms.data ?? []).filter(b => locationOf(b).toLowerCase().includes(query));
  }, [bathrooms.data, query]);

  /**
   * Floors are only offered once the search has landed on a single building.
   * Across two buildings "Floor 3" means two different places, and in a building
   * with one floor it's a filter with nothing to filter.
   */
  const buildings = useMemo(() => [...new Set(matches.map(b => b.building))] as Building[], [matches]);
  const floors = useMemo(
    () => (buildings.length === 1 ? [...new Set(matches.map(b => b.floor))].sort((a, b) => a - b) : []),
    [matches, buildings],
  );

  const shown = floor === null ? matches : matches.filter(b => b.floor === floor);

  /** Recents resolve against the live catalogue, so a row is never a stale copy. */
  const recents = useMemo(() => {
    const byId = new Map((bathrooms.data ?? []).map(b => [b.id, b]));
    return recentIds.map(id => byId.get(id)).filter((b): b is Bathroom => b !== undefined);
  }, [bathrooms.data, recentIds]);

  function choose(bathroom: Bathroom) {
    setRecentIds(pushRecent(bathroom.id));
    onPick(bathroom);
  }

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="px-5 pb-3 pt-14">
        <div className="mb-4">
          <BackButton onClick={onBack} />
        </div>

        <h1 className="mb-3" style={{ fontSize: 22, fontWeight: 800, color: palette.charcoal }}>
          {title}
        </h1>

        <SearchField
          value={search}
          onChange={next => {
            setSearch(next);
            setFloor(null);
          }}
          placeholder="Search by building"
          autoFocus
        />

        {/* Tapping the active floor again clears it, so there's no "all" chip. */}
        {floors.length > 1 && (
          <div className="phone-scroll mt-3 flex gap-2 overflow-x-auto pb-1">
            {floors.map(level => (
              <Chip key={level} active={floor === level} onClick={() => setFloor(floor === level ? null : level)}>
                Floor {level}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="phone-scroll flex-1 overflow-y-auto px-5 pb-4">
        {bathrooms.error && <Notice tone="error">{bathrooms.error}</Notice>}
        {bookmark.error && <Notice tone="error">{bookmark.error}</Notice>}
        {bathrooms.loading && !bathrooms.data && <LoadingScreen />}

        {query ? (
          <>
            <p className="mb-3" style={{ fontSize: 12, fontWeight: 700, color: palette.faint, letterSpacing: "0.04em" }}>
              {shown.length} RESULT{shown.length === 1 ? "" : "S"}
            </p>

            <div className="flex flex-col gap-2.5">
              {shown.map(bathroom => (
                <BathroomTile
                  key={bathroom.id}
                  bathroom={bathroom}
                  mine={myScores.get(bathroom.id) ?? null}
                  onPress={() => choose(bathroom)}
                  details={!picking}
                  onToggleBookmark={picking ? undefined : () => bookmark.toggle(bathroom)}
                />
              ))}
            </div>

            {shown.length === 0 && (
              <p className="py-10 text-center" style={{ color: palette.muted, fontSize: 13 }}>
                No washrooms match that.
              </p>
            )}
          </>
        ) : recents.length > 0 ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p style={{ fontSize: 12, fontWeight: 700, color: palette.faint, letterSpacing: "0.04em" }}>RECENTS</p>
              <button
                onClick={() => setRecentIds(clearRecents())}
                style={{ fontSize: 12, fontWeight: 600, color: palette.periwinkleDeep }}
              >
                Clear
              </button>
            </div>
            <div className="flex flex-col gap-2.5">
              {recents.map(bathroom => (
                <BathroomTile
                  key={bathroom.id}
                  bathroom={bathroom}
                  mine={myScores.get(bathroom.id) ?? null}
                  onPress={() => choose(bathroom)}
                  details={!picking}
                  onToggleBookmark={picking ? undefined : () => bookmark.toggle(bathroom)}
                />
              ))}
            </div>
          </>
        ) : (
          <p className="px-6 py-12 text-center" style={{ color: palette.muted, fontSize: 13, lineHeight: 1.6 }}>
            Search for a washroom by building, floor or room number.
          </p>
        )}
      </div>
    </div>
  );
}
