/**
 * Home, the feed.
 *
 * Search used to live on this screen, first as a filter over the catalogue and
 * then as a panel layered on top. Both made the page do two jobs at once. Now the
 * field here is a door: tapping it opens `SearchScreen`, and Home is just what the
 * people you follow have been rating.
 */

import type { Bathroom } from "../../shared/api";
import { listFeed } from "../api";
import { palette } from "../lib/display";
import { useAsync } from "../lib/useAsync";
import { EmptyState, LoadingScreen, Notice } from "./chrome";
import { FeedCard } from "./FeedCard";

export function HomeScreen({
  onOpenBathroom,
  onOpenProfile,
  onOpenSearch,
  onFindPeople,
}: {
  onOpenBathroom: (bathroom: Bathroom | number) => void;
  onOpenProfile: (userId: number) => void;
  onOpenSearch: () => void;
  onFindPeople: () => void;
}) {
  const feed = useAsync(() => listFeed(), []);

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="px-5 pb-3 pt-14">
        <h1 style={{ fontSize: 24, fontWeight: 800, color: palette.charcoal, letterSpacing: "-0.5px" }}>
          p<span style={{ color: palette.periwinkle }}>ü</span>pi
        </h1>

        {/* A button dressed as a field, the real one is on the search screen. */}
        <button
          onClick={onOpenSearch}
          className="mt-3 w-full px-4 py-3 text-left active:opacity-70"
          style={{
            background: "white",
            borderRadius: 14,
            border: `1.5px solid ${palette.border}`,
            fontSize: 15,
            color: palette.faint,
          }}
        >
          Search for a washroom...
        </button>
      </div>

      <div className="phone-scroll flex-1 overflow-y-auto px-5 pb-4">
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
