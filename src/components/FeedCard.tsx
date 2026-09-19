/**
 * One post in the feed: who rated what, and what they thought.
 *
 * This is the one surface that crosses the gender gate on purpose — you see a
 * friend's review of any washroom, which is the whole point of a feed. What keeps
 * that safe is the badge, which is never optional here. A post about a washroom
 * you don't use is read-only and says so.
 */

import type { FeedEntry } from "../../shared/api";
import { locationOf, palette, timeAgo, washroomMeta } from "../lib/display";
import { Avatar, ScoreChip, WashroomBadge } from "./chrome";

export function FeedCard({
  entry,
  onOpenBathroom,
  onOpenProfile,
}: {
  entry: FeedEntry;
  onOpenBathroom: () => void;
  onOpenProfile: () => void;
}) {
  const { user, bathroom, review, can_use } = entry;

  return (
    <div className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 1px 4px #0000000A" }}>
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
        <ScoreChip score={review.score} />
      </div>

      <button
        onClick={onOpenBathroom}
        disabled={!can_use}
        className="w-full rounded-xl p-3 text-left"
        style={{ background: palette.bg, cursor: can_use ? "pointer" : "default" }}
      >
        {/* Which washroom this is comes first, at full size. The feed is the one
            place that shows every type, so it's the one place this can't be a
            footnote under the name. */}
        <div className="mb-1.5">
          <WashroomBadge type={bathroom.washroom_type} size="md" />
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: palette.charcoal, lineHeight: 1.35 }}>
          {locationOf(bathroom)}
        </div>
      </button>

      {review.note && (
        <p style={{ fontSize: 13, color: palette.muted, marginTop: 10, lineHeight: 1.5 }}>“{review.note}”</p>
      )}

      {!can_use && (
        <p
          className="mt-2 px-3 py-2"
          style={{ fontSize: 11, fontWeight: 600, color: palette.faint, background: palette.bg, borderRadius: 10 }}
        >
          {washroomMeta[bathroom.washroom_type].label} — not one you use, so you can't rate or save it.
        </p>
      )}
    </div>
  );
}
