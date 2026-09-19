/**
 * Saved — your bookmarks, promoted out of the profile.
 *
 * It was a tab inside Profile, two taps from anywhere, which is the wrong depth
 * for a list you open when you're standing in a hallway deciding where to go.
 *
 * Everything here is already gender-gated: `setBookmark` refuses a washroom you
 * don't use, so this list can't contain one.
 */

import type { Bathroom } from "../../shared/api";
import { listBookmarks, setBookmark } from "../api";
import { palette } from "../lib/display";
import { useAsync } from "../lib/useAsync";
import { BathroomRow, EmptyState, LoadingScreen, Notice } from "./chrome";

export function SavedScreen({ onOpen }: { onOpen: (bathroom: Bathroom) => void }) {
  const bookmarks = useAsync(() => listBookmarks(), []);

  if (bookmarks.loading && !bookmarks.data) return <LoadingScreen />;
  const items = bookmarks.data ?? [];

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="px-5 pb-3 pt-14">
        <h1 style={{ fontSize: 24, fontWeight: 800, color: palette.charcoal }}>Saved</h1>
        <p style={{ fontSize: 13, color: palette.muted }}>
          {items.length} washroom{items.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="phone-scroll flex-1 overflow-y-auto px-5 pb-4">
        {bookmarks.error && <Notice tone="error">{bookmarks.error}</Notice>}

        {items.length === 0 ? (
          <EmptyState
            title="Nothing saved"
            body="Open any washroom and tap Save to keep it here."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {items.map(bathroom => (
              <div key={bathroom.id} className="relative">
                <BathroomRow bathroom={bathroom} onPress={() => onOpen(bathroom)} />
                <button
                  onClick={async () => {
                    await setBookmark(bathroom.id, false);
                    bookmarks.reload();
                  }}
                  className="absolute right-3 top-2 active:opacity-60"
                  style={{ fontSize: 11, fontWeight: 600, color: palette.faint }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
