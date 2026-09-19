/**
 * Find and follow people. Reached from the counts on a profile.
 *
 * This used to be a tab of its own next to the feed, which gave the app five
 * destinations for four ideas. Following is something you do about a person, so it
 * lives where people live.
 *
 * Following is instant and one-directional: tap, done. No request, no accept.
 */

import { useState } from "react";
import type { UserSummary } from "../../shared/api";
import { searchUsers, setFollow } from "../api";
import { palette, washroomMeta } from "../lib/display";
import { useAsync } from "../lib/useAsync";
import { Avatar, BackButton, LoadingScreen, Notice, SearchField } from "./chrome";

export function PeopleScreen({
  onBack,
  onOpenProfile,
}: {
  onBack: () => void;
  onOpenProfile: (userId: number) => void;
}) {
  const [query, setQuery] = useState("");
  const people = useAsync(() => searchUsers(query), [query]);

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="px-5 pb-3 pt-14">
        <div className="mb-4 flex items-center gap-3">
          <BackButton onClick={onBack} />
          <h1 style={{ fontSize: 20, fontWeight: 800, color: palette.charcoal }}>Find people</h1>
        </div>
        <SearchField value={query} onChange={setQuery} placeholder="Search by name or @username" />
      </div>

      <div className="phone-scroll flex-1 overflow-y-auto px-5 pb-4">
        {people.error && <Notice tone="error">{people.error}</Notice>}
        {people.loading && !people.data ? (
          <LoadingScreen />
        ) : (
          <div className="flex flex-col gap-2">
            {(people.data ?? []).map(person => (
              <PersonRow
                key={person.id}
                person={person}
                onOpen={() => onOpenProfile(person.id)}
                onChanged={people.reload}
              />
            ))}
          </div>
        )}
        {(people.data ?? []).length === 0 && !people.loading && (
          <p className="py-10 text-center" style={{ color: palette.muted, fontSize: 13 }}>
            Nobody by that name.
          </p>
        )}
      </div>
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
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{ background: "white", boxShadow: "0 1px 4px #0000000A" }}
    >
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
