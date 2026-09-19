/**
 * A profile — yours, or somebody else's.
 *
 * One component for both: `userId` undefined means you, which is what turns the
 * avatar in a feed row into a working link instead of a dead end. Your own profile
 * is the only one with bookmarks and a log out button.
 *
 * Their top three isn't gender-filtered, for the same reason the feed isn't — the
 * badge does the work.
 */

import { useState } from "react";
import type { Bathroom, Profile } from "../../shared/api";
import { getProfile, listBookmarks, logout, setBookmark, setFollow } from "../api";
import { buildingColor, gradient, initials, palette, scoreColor, washroomMeta } from "../lib/display";
import { useAsync } from "../lib/useAsync";
import { BackButton, BathroomRow, EmptyState, LoadingScreen, Notice, ScoreChip, Segmented, WashroomBadge } from "./chrome";

type Tab = "top" | "saved";

const MEDALS = ["🥇", "🥈", "🥉"];

export function ProfileScreen({
  userId,
  onBack,
  onOpenBathroom,
  onSignedOut,
}: {
  /** Undefined means the signed-in user. */
  userId?: number;
  onBack?: () => void;
  onOpenBathroom: (bathroom: Bathroom) => void;
  onSignedOut: () => void;
}) {
  const [tab, setTab] = useState<Tab>("top");
  const [busy, setBusy] = useState(false);

  const profile = useAsync(() => getProfile(userId), [userId]);
  const bookmarks = useAsync(() => (userId === undefined ? listBookmarks() : Promise.resolve([])), [userId]);

  const isMe = userId === undefined;

  if (profile.loading && !profile.data) return <LoadingScreen />;
  if (profile.error || !profile.data) {
    return (
      <div className="flex h-full flex-col gap-4 px-5 pt-14" style={{ background: palette.bg }}>
        {onBack && <BackButton onClick={onBack} />}
        <Notice tone="error">{profile.error ?? "Couldn't load that profile."}</Notice>
      </div>
    );
  }

  const data: Profile = profile.data;

  async function toggleFollow() {
    if (isMe || busy) return;
    setBusy(true);
    try {
      await setFollow(data.user.id, !data.user.following);
      profile.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="px-5 pb-5 pt-14" style={{ background: gradient.wash, borderRadius: "0 0 28px 28px" }}>
        {onBack && (
          <div className="mb-4">
            <BackButton onClick={onBack} />
          </div>
        )}

        <div className="flex items-center gap-4">
          <div
            className="flex flex-shrink-0 items-center justify-center rounded-full"
            style={{
              width: 66,
              height: 66,
              background: `${data.user.avatar_color}22`,
              color: data.user.avatar_color,
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            {initials(data.user.display_name)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate" style={{ fontSize: 22, fontWeight: 800, color: palette.charcoal }}>
              {data.user.display_name}
            </h1>
            <p style={{ fontSize: 13, color: palette.muted }}>@{data.user.username}</p>
            <div className="mt-1.5">
              <WashroomBadge type={data.user.washroom_pref} size="md" />
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Stat value={String(data.reviewed_count)} label="Rated" />
          <Stat
            value={data.average_score === null ? "—" : data.average_score.toFixed(1)}
            label="Avg given"
            color={data.average_score === null ? undefined : scoreColor(data.average_score)}
          />
          <Stat value={String(data.following_count)} label="Following" />
          <Stat value={String(data.followers_count)} label="Followers" />
        </div>

        {!isMe && (
          <button
            onClick={toggleFollow}
            disabled={busy}
            className="mt-4 w-full py-3 transition-all active:opacity-80"
            style={{
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 700,
              background: data.user.following ? "white" : gradient.primary,
              color: data.user.following ? palette.muted : "white",
              border: data.user.following ? `1.5px solid ${palette.border}` : "none",
            }}
          >
            {data.user.following ? "Following" : "Follow"}
          </button>
        )}
      </div>

      <div className="px-5 pt-4">
        {isMe ? (
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { id: "top", label: "Top rated" },
              { id: "saved", label: "Bookmarks" },
            ]}
          />
        ) : (
          <h3 style={{ fontSize: 15, fontWeight: 700, color: palette.charcoal }}>
            {data.user.display_name.split(" ")[0]}'s top rated
          </h3>
        )}
      </div>

      <div className="phone-scroll flex-1 overflow-y-auto px-5 py-4">
        {tab === "top" || !isMe ? (
          data.top.length === 0 ? (
            <EmptyState
              icon="🚽"
              title={isMe ? "No rankings yet" : "Nothing rated yet"}
              body={
                isMe
                  ? "Rate a bathroom and your podium shows up here."
                  : "They haven't rated anything you can see yet."
              }
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {data.top.map((entry, index) => (
                <button
                  key={entry.review_id}
                  onClick={() => onOpenBathroom(entry.bathroom)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left active:scale-[0.99]"
                  style={{ background: "white", boxShadow: "0 1px 4px #0000000A" }}
                >
                  <span style={{ fontSize: 20 }}>{MEDALS[index]}</span>
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
                  <ScoreChip score={entry.score} />
                </button>
              ))}
            </div>
          )
        ) : (bookmarks.data ?? []).length === 0 ? (
          <EmptyState
            icon="🔖"
            title="No bookmarks"
            body="Tap the bookmark on any bathroom to keep it here. You can only save washrooms you actually use."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {(bookmarks.data ?? []).map(bathroom => (
              <div key={bathroom.id} className="relative">
                <BathroomRow bathroom={bathroom} onPress={() => onOpenBathroom(bathroom)} bookmarked />
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

        {isMe && (
          <button
            onClick={async () => {
              await logout();
              onSignedOut();
            }}
            className="mt-6 w-full py-3"
            style={{ fontSize: 14, fontWeight: 600, color: "#E8736D" }}
          >
            Log out
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className="flex-1 rounded-2xl px-2 py-2 text-center" style={{ background: "white" }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: color ?? palette.charcoal }}>{value}</div>
      <div style={{ fontSize: 10, color: palette.muted, fontWeight: 500 }}>{label}</div>
    </div>
  );
}
