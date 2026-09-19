/**
 * One bathroom.
 *
 * Two numbers live here and they are labelled apart on purpose: YOUR SCORE comes
 * from where this sits in your ranking, and the campus average is the mean of
 * everyone's personal score. The category bars are your own 1–5 ratings, doubled
 * for display so they share the 0–10 scale with the score above them.
 */

import { useState } from "react";
import type { Bathroom, BathroomDetail, RatingCategory } from "../../shared/api";
import { getBathroom, setBookmark, setWantToGo } from "../api";
import { categoryMeta, gradient, locationOf, palette, scoreColor, scoreLabel, timeAgo } from "../lib/display";
import { useAsync } from "../lib/useAsync";
import {
  Avatar,
  BackButton,
  BookmarkButton,
  LoadingScreen,
  Notice,
  PrimaryButton,
  ScoreChip,
  WashroomBadge,
} from "./chrome";
import { FlagIcon } from "./icons";

export function DetailScreen({
  bathroomId,
  onBack,
  onRate,
  onOpenProfile,
}: {
  bathroomId: number;
  onBack: () => void;
  /** The bathroom is already chosen here, so the flow opens straight at step 2. */
  onRate: (bathroom: Bathroom) => void;
  onOpenProfile: (userId: number) => void;
}) {
  const detail = useAsync(() => getBathroom(bathroomId), [bathroomId]);
  const [pending, setPending] = useState<string | null>(null);

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

  async function toggle(kind: "bookmark" | "want", next: boolean) {
    setPending(null);
    try {
      if (kind === "bookmark") await setBookmark(bathroomId, next);
      else await setWantToGo(bathroomId, next);
      detail.reload();
    } catch (err) {
      setPending(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="px-5 pb-6 pt-14" style={{ background: gradient.wash, borderRadius: "0 0 28px 28px" }}>
        <div className="mb-4 flex items-center justify-between">
          <BackButton onClick={onBack} />
          <BookmarkButton on={bathroom.bookmarked} onToggle={() => toggle("bookmark", !bathroom.bookmarked)} />
        </div>

        <div className="mb-2 flex items-center gap-2">
          <span
            className="rounded-lg px-2.5 py-1"
            style={{
              background: `${bathroom.building === "E5" ? "#7B8CDE" : "#5EC4A8"}20`,
              color: bathroom.building === "E5" ? "#7B8CDE" : "#5EC4A8",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {bathroom.building}
          </span>
          <span style={{ color: palette.muted, fontSize: 13 }}>Floor {bathroom.floor}</span>
          <WashroomBadge type={bathroom.washroom_type} />
          {bathroom.accessible && (
            <span
              className="rounded-full px-2 py-0.5"
              style={{ background: "#E6F7F4", color: "#5EC4B0", fontSize: 11, fontWeight: 600 }}
            >
              ♿ Accessible stall
            </span>
          )}
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: palette.charcoal, lineHeight: 1.3, marginBottom: 12 }}>
          {locationOf(bathroom)}
        </h2>

        {mine ? (
          <div className="flex items-end gap-4">
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: palette.muted, marginBottom: 4 }}>YOUR SCORE</div>
              <div className="flex items-baseline gap-1">
                <span style={{ fontSize: 52, fontWeight: 800, color: scoreColor(mine.score), lineHeight: 1 }}>
                  {mine.score.toFixed(1)}
                </span>
                <span style={{ fontSize: 18, color: palette.faint, fontWeight: 600 }}>/10</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: scoreColor(mine.score), marginTop: 2 }}>
                {scoreLabel(mine.score)}
              </div>
            </div>
            <div className="flex gap-1 pb-1">
              {categoryMeta.map(category => (
                <MiniBar
                  key={category.key}
                  icon={category.icon}
                  value={mine[category.key as RatingCategory] * 2}
                  color={scoreColor(mine.score)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{ background: palette.bg, border: "1.5px dashed #C5CBEF" }}
          >
            <span style={{ fontSize: 24 }}>📊</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: palette.charcoal }}>You haven't rated this yet</div>
              <div style={{ fontSize: 12, color: palette.muted }}>Tap below to add it to your ranking</div>
            </div>
          </div>
        )}
      </div>

      <div className="phone-scroll flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        {pending && <Notice tone="error">{pending}</Notice>}

        <div className="rounded-2xl p-4" style={{ background: "white" }}>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: palette.charcoal }}>Campus average</div>
              <div style={{ fontSize: 12, color: palette.muted, marginTop: 2 }}>
                {bathroom.review_count === 0
                  ? "Be the first to rate it"
                  : `Across ${bathroom.review_count} ${bathroom.review_count === 1 ? "review" : "reviews"}`}
              </div>
            </div>
            <ScoreChip score={bathroom.global_score} />
          </div>
        </div>

        {mine && (
          <div className="rounded-2xl p-4" style={{ background: "white" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: palette.charcoal, marginBottom: 14 }}>
              Your category breakdown
            </h3>
            <div className="flex flex-col gap-3.5">
              {categoryMeta.map(category => {
                const value = mine[category.key as RatingCategory] * 2;
                return (
                  <div key={category.key} className="flex items-center gap-3">
                    <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{category.icon}</span>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center justify-between">
                        <span style={{ fontSize: 12, fontWeight: 600, color: palette.charcoal }}>{category.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(value) }}>
                          {value.toFixed(1)}
                        </span>
                      </div>
                      <div style={{ height: 6, background: "#F0EEE9", borderRadius: 999, overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${(value / 10) * 100}%`,
                            background: `linear-gradient(90deg, ${scoreColor(value)}, ${scoreColor(value)}BB)`,
                            borderRadius: 999,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {mine.note && (
              <p
                className="mt-4 px-3 py-2.5"
                style={{ background: palette.bg, borderRadius: 12, fontSize: 13, color: palette.muted, lineHeight: 1.5 }}
              >
                “{mine.note}”
              </p>
            )}
          </div>
        )}

        {bathroom.friend_reviews.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: "white" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: palette.charcoal, marginBottom: 12 }}>
              Friends' ratings
            </h3>
            <div className="flex flex-col gap-3">
              {bathroom.friend_reviews.map(review => (
                <button
                  key={review.user.id}
                  onClick={() => onOpenProfile(review.user.id)}
                  className="flex items-start justify-between gap-3 text-left active:opacity-70"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar user={review.user} />
                    <div className="min-w-0">
                      <span style={{ fontSize: 14, fontWeight: 600, color: palette.charcoal }}>
                        {review.user.display_name}
                      </span>
                      <div style={{ fontSize: 11, color: palette.faint }}>{timeAgo(review.created_at)}</div>
                      {review.note && (
                        <p style={{ fontSize: 12, color: palette.muted, marginTop: 4, lineHeight: 1.45 }}>
                          “{review.note}”
                        </p>
                      )}
                    </div>
                  </div>
                  <ScoreChip score={review.score} />
                </button>
              ))}
            </div>
          </div>
        )}

        {!mine && (
          <button
            onClick={() => toggle("want", !bathroom.want_to_go)}
            className="flex w-full items-center gap-3 rounded-2xl p-4 transition-all active:opacity-70"
            style={{
              background: bathroom.want_to_go ? palette.periwinkleLight : "white",
              border: bathroom.want_to_go ? `1.5px solid ${palette.periwinkle}` : "1.5px dashed #C5CBEF",
            }}
          >
            <div
              className="flex items-center justify-center rounded-xl"
              style={{ width: 44, height: 44, background: palette.periwinkleLight }}
            >
              <FlagIcon />
            </div>
            <div className="text-left">
              <div style={{ fontSize: 14, fontWeight: 700, color: palette.periwinkle }}>
                {bathroom.want_to_go ? "On your want-to-go list" : "Add to want-to-go"}
              </div>
              <div style={{ fontSize: 11, color: palette.muted }}>
                {bathroom.want_to_go ? "Tap to remove" : "Bathrooms you mean to try"}
              </div>
            </div>
          </button>
        )}

        <div className="mb-2">
          <PrimaryButton onClick={() => onRate(bathroom)} tone={mine ? "dark" : "primary"}>
            {mine ? "↺  Re-rate this bathroom" : "⭐  Rate this bathroom"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function MiniBar({ icon, value, color }: { icon: string; value: number; color: string }) {
  return (
    <div className="flex flex-col-reverse items-center gap-1">
      <div style={{ fontSize: 8, color: palette.faint, fontWeight: 500 }}>{icon}</div>
      <div style={{ width: 6, height: 40, borderRadius: 4, background: palette.border, overflow: "hidden" }}>
        <div
          style={{
            width: "100%",
            height: `${(value / 10) * 100}%`,
            marginTop: `${100 - (value / 10) * 100}%`,
            background: `linear-gradient(to top, ${color}, ${color}88)`,
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  );
}
