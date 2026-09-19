/**
 * One washroom: what everyone thinks, what you thought, and the way in to rating it.
 *
 * Pared back on purpose. Friends' individual ratings live in the feed, where
 * they're attached to a person and a moment; repeating them here turned a page
 * about a room into a second feed. What's left is the pair of numbers that
 * actually differ — the campus average and your own score — plus whatever you
 * recorded last time.
 */

import { useState } from "react";
import type { Bathroom, BathroomDetail, ReviewDetailKey } from "../../shared/api";
import { detailKeysFor } from "../../shared/api";
import { getBathroom, setBookmark } from "../api";
import { detailMeta, gradient, locationOf, palette, scoreColor, scoreLabel } from "../lib/display";
import { useAsync } from "../lib/useAsync";
import { BackButton, LoadingScreen, Notice, PrimaryButton, SaveButton, WashroomBadge } from "./chrome";
import { StarIcon } from "./icons";

export function DetailScreen({
  bathroomId,
  onBack,
  onRate,
}: {
  bathroomId: number;
  onBack: () => void;
  onRate: (bathroom: Bathroom) => void;
}) {
  const detail = useAsync(() => getBathroom(bathroomId), [bathroomId]);
  const [error, setError] = useState<string | null>(null);

  if (detail.loading && !detail.data) return <LoadingScreen />;

  if (detail.error || !detail.data) {
    return (
      <div className="flex h-full flex-col gap-4 px-5 pt-14" style={{ background: palette.bg }}>
        <BackButton onClick={onBack} />
        <Notice tone="error">{detail.error ?? "That bathroom isn't available."}</Notice>
      </div>
    );
  }

  const bathroom: BathroomDetail = detail.data;
  const mine = bathroom.my_review;

  async function toggleSave(next: boolean) {
    setError(null);
    try {
      await setBookmark(bathroomId, next);
      detail.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const recorded = detailKeysFor(bathroom.washroom_type).filter(
    key => mine?.[key as ReviewDetailKey] != null,
  );

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="px-5 pb-6 pt-14" style={{ background: gradient.wash, borderRadius: "0 0 28px 28px" }}>
        <div className="mb-4 flex items-center justify-between">
          <BackButton onClick={onBack} />
          <SaveButton on={bathroom.bookmarked} onToggle={() => toggleSave(!bathroom.bookmarked)} />
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <WashroomBadge type={bathroom.washroom_type} size="md" />
          {bathroom.accessible && (
            <span
              className="rounded-full px-2 py-0.5"
              style={{ background: "white", color: palette.muted, fontSize: 11, fontWeight: 600 }}
            >
              Accessible stall
            </span>
          )}
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: palette.charcoal, lineHeight: 1.3, marginBottom: 16 }}>
          {locationOf(bathroom)}
        </h2>

        <div className="flex gap-3">
          <BigScore
            label="CAMPUS AVERAGE"
            value={bathroom.global_score}
            caption={
              bathroom.review_count === 0
                ? "No ratings yet"
                : `${bathroom.review_count} ${bathroom.review_count === 1 ? "rating" : "ratings"}`
            }
          />
          <BigScore
            label="YOUR SCORE"
            value={mine?.score ?? null}
            caption={mine ? scoreLabel(mine.score) : "Not rated yet"}
          />
        </div>
      </div>

      <div className="phone-scroll flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
        {error && <Notice tone="error">{error}</Notice>}

        {mine && mine.photos.length > 0 && (
          <div className="flex gap-2">
            {mine.photos.map((src, index) => (
              <img
                key={index}
                src={src}
                alt=""
                style={{ width: 110, height: 110, borderRadius: 14, objectFit: "cover", display: "block" }}
              />
            ))}
          </div>
        )}

        {mine?.note && (
          <div className="rounded-2xl p-4" style={{ background: "white" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: palette.charcoal, marginBottom: 8 }}>Your note</h3>
            <p style={{ fontSize: 13, color: palette.muted, lineHeight: 1.5 }}>“{mine.note}”</p>
          </div>
        )}

        {mine && recorded.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: "white" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: palette.charcoal }}>Your details</h3>
            <p style={{ fontSize: 11, color: palette.faint, marginBottom: 4 }}>
              Recorded for reference — they don't affect the score
            </p>
            {recorded.map(key => {
              const value = mine[key as ReviewDetailKey] ?? 0;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between py-2.5"
                  style={{ borderTop: `1px solid ${palette.border}` }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: palette.charcoal }}>
                    {detailMeta[key]?.label ?? key}
                  </span>
                  <span className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <StarIcon key={star} filled={value >= star} size={14} />
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="mb-2">
          <PrimaryButton onClick={() => onRate(bathroom)} tone={mine ? "dark" : "primary"}>
            {mine ? "Re-rate this bathroom" : "Rate this bathroom"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function BigScore({ label, value, caption }: { label: string; value: number | null; caption: string }) {
  return (
    <div className="flex-1 rounded-2xl px-4 py-3" style={{ background: "white" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: palette.muted, letterSpacing: "0.06em" }}>{label}</div>
      <div className="flex items-baseline gap-1" style={{ marginTop: 2 }}>
        <span
          className="tabular-nums"
          style={{
            fontSize: 34,
            fontWeight: 800,
            lineHeight: 1.1,
            color: value === null ? palette.faint : scoreColor(value),
          }}
        >
          {value === null ? "–" : value.toFixed(1)}
        </span>
        {value !== null && <span style={{ fontSize: 13, color: palette.faint, fontWeight: 600 }}>/10</span>}
      </div>
      <div style={{ fontSize: 11, color: palette.faint, marginTop: 2 }}>{caption}</div>
    </div>
  );
}
