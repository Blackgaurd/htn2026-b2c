/**
 * A profile, yours or somebody else's.
 *
 * One component for both: `userId` undefined means you, which is what turns the
 * avatar in a feed row into a working link instead of a dead end. Your own
 * profile is the only one with bookmarks and a log out button.
 *
 * The body is tabbed, and the default tab is Recent activity. A profile is a
 * record of what somebody has been doing; their best three was a second, shorter
 * copy of the rankings screen, which already exists and is already sorted.
 *
 * Neither tab is gender-filtered, for the same reason the feed isn't: the badge
 * on every row does that work.
 */

import { useState } from "react";
import type { Bathroom, Profile, ProfileActivity } from "../../shared/api";
import { getProfile, listBookmarks, logout, setBookmark, setFollow, updateProfile } from "../api";
import { gradient, initials, locationOf, palette, timeAgo } from "../lib/display";
import { useAsync } from "../lib/useAsync";
import {
  BackButton,
  BathroomRow,
  BookmarkButton,
  EmptyState,
  LoadingScreen,
  Notice,
  ScoreChip,
  Segmented,
  WashroomBadge,
} from "./chrome";

type ProfileTab = "activity" | "bookmarks";

export function ProfileScreen({
  userId,
  onBack,
  onOpenBathroom,
  onSignedOut,
  onFindPeople,
}: {
  /** Undefined means the signed-in user. */
  userId?: number;
  onBack?: () => void;
  onOpenBathroom: (bathroom: Bathroom) => void;
  onSignedOut: () => void;
  /** Following/followers are a door to the people list, not just a number. */
  onFindPeople: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<ProfileTab>("activity");
  const [editingBio, setEditingBio] = useState(false);

  const isMe = userId === undefined;

  const profile = useAsync(() => getProfile(userId), [userId]);
  const bookmarks = useAsync(
    () => (userId === undefined ? listBookmarks() : Promise.resolve([])),
    [userId],
  );

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
  const firstName = data.user.display_name.split(" ")[0];
  const saved = bookmarks.data ?? [];

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
              width: 62,
              height: 62,
              background: `${data.user.avatar_color}22`,
              color: data.user.avatar_color,
              fontSize: 23,
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

        {(data.user.bio || isMe) && (
          <div className="mt-3.5">
            {editingBio ? (
              <BioEditor
                initial={data.user.bio ?? ""}
                onCancel={() => setEditingBio(false)}
                onSave={async next => {
                  await updateProfile({ bio: next || null });
                  setEditingBio(false);
                  profile.reload();
                }}
              />
            ) : data.user.bio ? (
              <p style={{ fontSize: 13, color: palette.muted, lineHeight: 1.5 }}>
                {data.user.bio}
                {isMe && (
                  <button
                    onClick={() => setEditingBio(true)}
                    className="ml-2 active:opacity-70"
                    style={{ fontSize: 12, fontWeight: 600, color: palette.periwinkle }}
                  >
                    Edit
                  </button>
                )}
              </p>
            ) : (
              <button
                onClick={() => setEditingBio(true)}
                style={{ fontSize: 13, fontWeight: 600, color: palette.periwinkle }}
              >
                + Add a bio
              </button>
            )}
          </div>
        )}

        {/*
          One strip, three equal cells, no gaps to leave standing empty. Rated is
          the only one that is a score of anything, so it takes the colour and the
          other two stay quiet.
        */}
        <div
          className="mt-4 flex overflow-hidden"
          style={{ borderRadius: 18, background: "white", boxShadow: "0 1px 5px #0000000D" }}
        >
          <div
            className="flex flex-1 flex-col items-center justify-center py-3"
            style={{ background: gradient.primary }}
          >
            <span className="tabular-nums" style={{ fontSize: 24, fontWeight: 800, color: "white", lineHeight: 1 }}>
              {data.reviewed_count}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#ffffffd9", marginTop: 5, letterSpacing: "0.06em" }}>
              RATED
            </span>
          </div>
          <StatCell
            value={data.following_count}
            label="FOLLOWING"
            onPress={isMe ? onFindPeople : undefined}
          />
          <StatCell
            value={data.followers_count}
            label="FOLLOWERS"
            divided
            onPress={isMe ? onFindPeople : undefined}
          />
        </div>

        {!isMe && (
          <button
            onClick={toggleFollow}
            disabled={busy}
            className="mt-3 w-full py-3 transition-all active:opacity-80"
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

      {isMe ? (
        <div className="px-5 pt-4">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { id: "activity", label: "Recent activity" },
              { id: "bookmarks", label: "Bookmarked" },
            ]}
          />
        </div>
      ) : (
        <div className="px-5 pt-4">
          <h3 style={{ fontSize: 15, fontWeight: 700, color: palette.charcoal }}>{firstName}'s recent activity</h3>
        </div>
      )}

      <div className="phone-scroll flex-1 overflow-y-auto px-5 py-4">
        {isMe && tab === "bookmarks" ? (
          saved.length === 0 ? (
            <EmptyState
              title="Nothing bookmarked"
              body="Open any washroom and tap the bookmark to keep it here."
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {saved.map(bathroom => (
                <div key={bathroom.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <BathroomRow bathroom={bathroom} onPress={() => onOpenBathroom(bathroom)} />
                  </div>
                  <BookmarkButton
                    on
                    onToggle={async () => {
                      await setBookmark(bathroom.id, false);
                      bookmarks.reload();
                    }}
                  />
                </div>
              ))}
            </div>
          )
        ) : data.recent.length === 0 ? (
          <EmptyState
            title="Nothing rated yet"
            body={
              isMe
                ? "Rate a washroom and it shows up here, newest first."
                : "They haven't rated anything yet."
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {data.recent.map(entry => (
              <ActivityRow key={entry.review.id} entry={entry} onPress={() => onOpenBathroom(entry.bathroom)} />
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

/**
 * One review, as a thing that happened.
 *
 * Rank and time sit on one quiet line under the name; the score keeps the right
 * edge to itself so a column of these stays scannable.
 */
function ActivityRow({ entry, onPress }: { entry: ProfileActivity; onPress: () => void }) {
  const when = timeAgo(entry.review.created_at);

  return (
    <button
      onClick={onPress}
      className="flex w-full items-start gap-3 px-4 py-3.5 text-left active:scale-[0.99]"
      style={{ background: "white", borderRadius: 16, boxShadow: "0 1px 4px #0000000A" }}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1">
          <WashroomBadge type={entry.bathroom.washroom_type} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: palette.charcoal, lineHeight: 1.35 }}>
          {locationOf(entry.bathroom)}
        </div>
        <div className="mt-1" style={{ fontSize: 11.5, fontWeight: 500, color: palette.faint }}>
          #{entry.rank}
          {when && ` · ${when}`}
        </div>
        {entry.review.note && (
          <p className="mt-1.5" style={{ fontSize: 12.5, color: palette.muted, lineHeight: 1.45 }}>
            {entry.review.note}
          </p>
        )}
      </div>
      <ScoreChip score={entry.review.score} />
    </button>
  );
}

function BioEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (next: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <div>
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        rows={2}
        maxLength={140}
        autoFocus
        placeholder="Tell people what you're looking for in a washroom."
        className="w-full resize-none outline-none"
        style={{
          borderRadius: 12,
          background: "white",
          border: `1.5px solid ${palette.border}`,
          padding: "10px 12px",
          fontSize: 13,
          color: palette.charcoal,
          fontFamily: "inherit",
          lineHeight: 1.5,
        }}
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={() => onSave(value.trim())}
          style={{ fontSize: 13, fontWeight: 700, color: palette.periwinkle }}
        >
          Save
        </button>
        <button onClick={onCancel} style={{ fontSize: 13, fontWeight: 600, color: palette.faint }}>
          Cancel
        </button>
        <span className="ml-auto" style={{ fontSize: 11, color: palette.faint }}>
          {value.length}/140
        </span>
      </div>
    </div>
  );
}

function StatCell({
  value,
  label,
  divided,
  onPress,
}: {
  value: number;
  label: string;
  divided?: boolean;
  onPress?: () => void;
}) {
  const Tag = onPress ? "button" : "div";
  return (
    <Tag
      onClick={onPress}
      className="flex flex-1 flex-col items-center justify-center py-3"
      style={{ borderLeft: divided ? `1px solid ${palette.border}` : "none" }}
    >
      <span className="tabular-nums" style={{ fontSize: 24, fontWeight: 800, color: palette.charcoal, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: 10, fontWeight: 700, color: palette.faint, marginTop: 5, letterSpacing: "0.06em" }}>
        {label}
      </span>
    </Tag>
  );
}
