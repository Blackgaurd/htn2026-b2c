/**
 * The friends feed — the one place the gender gate deliberately doesn't apply.
 *
 * You see what anyone you follow rated, men's rooms included, because the point is
 * to see your friends' taste. What makes that safe is the badge: every row states
 * the washroom type outright. Rows you can't use say so and go nowhere — no
 * bookmark, no rate, no tap-through to a detail screen that would only reject you.
 *
 * Following is instant and one-directional. There is no request, no accept.
 */

import { useState } from "react";
import type { FeedEntry, UserSummary } from "../../shared/api";
import { listFeed, searchUsers, setFollow } from "../api";
import { buildingColor, locationOf, palette, timeAgo, washroomMeta } from "../lib/display";
import { useAsync } from "../lib/useAsync";
import { Avatar, EmptyState, LoadingScreen, Notice, ScoreChip, SearchField, Segmented, WashroomBadge } from "./chrome";

type Tab = "feed" | "find";

export function FriendsScreen({
  onOpenBathroom,
  onOpenProfile,
}: {
  onOpenBathroom: (bathroomId: number) => void;
  onOpenProfile: (userId: number) => void;
}) {
  const [tab, setTab] = useState<Tab>("feed");
  const [query, setQuery] = useState("");

  const feed = useAsync(() => listFeed(), []);
  const people = useAsync(() => searchUsers(query), [query]);

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="px-5 pb-3 pt-14">
        <h1 style={{ fontSize: 24, fontWeight: 800, color: palette.charcoal }}>Friends</h1>
        <p style={{ fontSize: 13, color: palette.muted, marginBottom: 12 }}>
          What everyone you follow has been rating
        </p>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { id: "feed", label: "Feed" },
            { id: "find", label: "Find people" },
          ]}
        />
      </div>

      {tab === "feed" ? (
        <div className="phone-scroll flex-1 overflow-y-auto px-5 pb-4">
          {feed.error && <Notice tone="error">{feed.error}</Notice>}
          {feed.loading && !feed.data ? (
            <LoadingScreen />
          ) : (feed.data ?? []).length === 0 ? (
            <EmptyState
              icon="👀"
              title="Your feed is empty"
              body="Follow a few people and their reviews will show up here — including washrooms you don't use, clearly labelled."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {(feed.data ?? []).map(entry => (
                <FeedRow
                  key={entry.review.id}
                  entry={entry}
                  onOpenBathroom={() => entry.can_use && onOpenBathroom(entry.bathroom.id)}
                  onOpenProfile={() => onOpenProfile(entry.user.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="phone-scroll flex-1 overflow-y-auto px-5 pb-4">
          <div className="mb-3">
            <SearchField value={query} onChange={setQuery} placeholder="Search by name or @username" />
          </div>
          {people.error && <Notice tone="error">{people.error}</Notice>}
          <div className="flex flex-col gap-2">
            {(people.data ?? []).map(person => (
              <PersonRow key={person.id} person={person} onOpen={() => onOpenProfile(person.id)} onChanged={people.reload} />
            ))}
          </div>
          {(people.data ?? []).length === 0 && !people.loading && (
            <p className="py-10 text-center" style={{ color: palette.muted, fontSize: 13 }}>
              Nobody by that name.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function FeedRow({
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
        <div className="min-w-0 flex-1">
          <button onClick={onOpenProfile} className="text-left active:opacity-70">
            <span style={{ fontSize: 14, fontWeight: 700, color: palette.charcoal }}>{user.display_name}</span>
            <span style={{ fontSize: 13, color: palette.muted }}> rated</span>
          </button>
          <div style={{ fontSize: 11, color: palette.faint }}>
            @{user.username} · {timeAgo(review.created_at)}
          </div>
        </div>
        <ScoreChip score={review.score} />
      </div>

      <button
        onClick={onOpenBathroom}
        disabled={!can_use}
        className="flex w-full items-center gap-3 rounded-xl p-3 text-left"
        style={{ background: palette.bg, cursor: can_use ? "pointer" : "default" }}
      >
        <div
          className="flex flex-shrink-0 items-center justify-center rounded-lg"
          style={{
            width: 34,
            height: 34,
            background: `${buildingColor(bathroom.building)}20`,
            color: buildingColor(bathroom.building),
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {bathroom.building}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: palette.charcoal }}>
            {locationOf(bathroom)}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            {/* Never optional. This is what makes a cross-type feed readable. */}
            <WashroomBadge type={bathroom.washroom_type} />
            {bathroom.global_score !== null && (
              <span style={{ fontSize: 11, color: palette.faint }}>avg {bathroom.global_score.toFixed(1)}</span>
            )}
          </div>
        </div>
        {can_use && <span style={{ fontSize: 16, color: palette.faint }}>›</span>}
      </button>

      {review.note && (
        <p style={{ fontSize: 13, color: palette.muted, marginTop: 10, lineHeight: 1.5 }}>“{review.note}”</p>
      )}

      {!can_use && (
        <p
          className="mt-2 px-3 py-2"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: palette.faint,
            background: palette.bg,
            borderRadius: 10,
          }}
        >
          🔒 {washroomMeta[bathroom.washroom_type].label} — not one you use, so you can't rate or save it.
        </p>
      )}
    </div>
  );
}

function PersonRow({
  person,
  onOpen,
  onChanged,
}: {
  person: UserSummary;
  onOpen: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await setFollow(person.id, !person.following);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "white", boxShadow: "0 1px 4px #0000000A" }}>
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-70">
        <Avatar user={person} />
        <div className="min-w-0">
          <div className="truncate" style={{ fontSize: 14, fontWeight: 700, color: palette.charcoal }}>
            {person.display_name}
          </div>
          <div style={{ fontSize: 11, color: palette.faint }}>
            @{person.username} · uses {washroomMeta[person.washroom_pref].label}
          </div>
        </div>
      </button>

      <button
        onClick={toggle}
        disabled={busy}
        className="flex-shrink-0 rounded-full px-4 py-2 transition-all active:opacity-70"
        style={{
          fontSize: 12,
          fontWeight: 700,
          background: person.following ? palette.bg : palette.periwinkle,
          color: person.following ? palette.muted : "white",
          border: person.following ? `1.5px solid ${palette.border}` : "none",
        }}
      >
        {person.following ? "Following" : "Follow"}
      </button>
    </div>
  );
}
