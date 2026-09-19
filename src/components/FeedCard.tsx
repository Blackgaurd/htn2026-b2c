/**
 * One post in the feed: who rated what, and everything they said about it.
 *
 * A post now carries the whole review, the detail stars, the photos and the
 * note, because a feed row that only showed a score made you open the washroom
 * to find out what your friend actually thought, and the washroom page doesn't
 * hold their review anyway. Nothing here is a link to a bigger version of
 * itself: the card *is* the review. The only things that navigate are the
 * person (to their profile) and the two compact actions in the header.
 *
 * This is the one surface that crosses the gender gate on purpose, you see a
 * friend's review of any washroom, which is the whole point of a feed. What
 * keeps that safe is the badge on the tile, which is never optional here. A post
 * about a washroom you don't use simply has no buttons, and doesn't need a
 * sentence explaining that the badge means what it says.
 */

import type { ReactNode } from "react";
import type { FeedEntry } from "../../shared/api";
import { gradient, palette, timeAgo } from "../lib/display";
import { Avatar, BathroomTile, BookmarkButton, PhotoStrip, ReviewDetails, ScoreChip } from "./chrome";
import { PlusIcon } from "./icons";

export function FeedCard({
  entry,
  mine,
  onOpenProfile,
  onToggleBookmark,
  onRate,
}: {
  entry: FeedEntry;
  /** Your own score for this washroom, if you've rated it. */
  mine: number | null;
  onOpenProfile: () => void;
  onToggleBookmark: () => void;
  onRate: () => void;
}) {
  const { user, bathroom, review, can_use } = entry;

  return (
    <div className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 6px 18px #292B451A" }}>
      <div className="mb-3 flex items-center gap-3">
        <button onClick={onOpenProfile} className="active:opacity-70">
          <Avatar user={user} />
        </button>
        <button onClick={onOpenProfile} className="min-w-0 flex-1 text-left active:opacity-70">
          <div className="truncate" style={{ fontSize: 14, fontWeight: 700, color: palette.charcoal }}>
            {user.display_name}
          </div>
          <div style={{ fontSize: 11, color: palette.faint }}>
            @{user.username} · {timeAgo(review.created_at)}
          </div>
        </button>
        {can_use && (
          <div className="flex flex-shrink-0 items-center gap-1">
            <BookmarkButton on={bathroom.bookmarked} onToggle={onToggleBookmark} size={32} circular />
            <FeedAction label="Rate this bathroom" onClick={onRate} icon={<PlusIcon size={18} />} />
          </div>
        )}
        <ScoreChip score={review.score} />
      </div>

      {/* The same tile every list uses, minus the tap: there's nowhere to go. */}
      <BathroomTile bathroom={bathroom} mine={mine} canUse={false} showScores={false} raised />

      <div className="mt-3 flex flex-col gap-3">
        <ReviewDetails review={review} type={bathroom.washroom_type} />
        <PhotoStrip photos={review.photos} />
        {review.note && (
          <p style={{ fontSize: 13, color: palette.muted, lineHeight: 1.5 }}>“{review.note}”</p>
        )}
      </div>

    </div>
  );
}

function FeedAction({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-full active:opacity-70"
      style={{
        background: gradient.brand,
        border: "none",
      }}
    >
      {icon}
    </button>
  );
}
