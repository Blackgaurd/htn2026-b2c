/**
 * Step 2 of rating: the five categories, a note, and the bucket.
 *
 * The number in the header is the plain average of the stars and is labelled a
 * *first impression* — it is NOT the score. The score doesn't exist yet; it comes
 * out of the duel on the next screen. Showing it here as "score" would quietly turn
 * the app back into a star-rating app.
 *
 * The bucket is the last thing asked because it's the one that matters: it picks
 * which band the duel searches, and the duel only ever compares like with like.
 */

import { useState } from "react";
import type { Bathroom, Bucket, RatingCategory, Ratings } from "../../shared/api";
import { BUCKET_LABELS, BUCKET_ORDER, ratingsAverage } from "../../shared/api";
import type { ReviewDraft } from "../lib/duel";
import { STAR_LABELS, buildingColor, categoryMeta, gradient, locationOf, palette, scoreColor } from "../lib/display";
import { BackButton, WashroomBadge } from "./chrome";
import { StarIcon } from "./icons";

const BUCKET_STYLE: Record<Bucket, { emoji: string; color: string; bg: string }> = {
  loved: { emoji: "😍", color: "#3DBF82", bg: "#E8F8F0" },
  fine: { emoji: "🙂", color: "#5B8FE8", bg: "#EBF1FD" },
  never: { emoji: "🙅", color: "#E8736D", bg: "#FDECEB" },
};

export function RateScoreScreen({
  bathroom,
  onBack,
  onContinue,
}: {
  bathroom: Bathroom;
  onBack: () => void;
  onContinue: (draft: ReviewDraft) => void;
}) {
  const [ratings, setRatings] = useState<Partial<Record<RatingCategory, number>>>({});
  const [note, setNote] = useState("");
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [hovered, setHovered] = useState<{ key: RatingCategory; value: number } | null>(null);

  const complete = categoryMeta.every(category => ratings[category.key]);
  const impression = complete ? ratingsAverage(ratings as Ratings) : null;
  const ready = complete && bucket !== null;

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="px-5 pb-5 pt-14" style={{ background: gradient.wash, borderRadius: "0 0 24px 24px" }}>
        <div className="mb-4 flex items-center gap-3">
          <BackButton onClick={onBack} />
          <div className="flex-1">
            <p style={{ fontSize: 11, fontWeight: 700, color: palette.muted, letterSpacing: "0.08em" }}>STEP 2 OF 2</p>
            <h1 style={{ fontSize: 17, fontWeight: 800, color: palette.charcoal }}>Rate this bathroom</h1>
          </div>
          {impression !== null && (
            <div
              className="flex flex-col items-center justify-center rounded-xl px-3 py-1"
              style={{ background: `${scoreColor(impression)}22` }}
            >
              <span style={{ fontSize: 17, fontWeight: 800, color: scoreColor(impression) }}>
                {impression.toFixed(1)}
              </span>
              <span style={{ fontSize: 8, fontWeight: 700, color: palette.muted, letterSpacing: "0.04em" }}>
                FIRST TAKE
              </span>
            </div>
          )}
        </div>

        <div style={{ height: 4, background: palette.border, borderRadius: 999, marginBottom: 12 }}>
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, #7B8CDE, #9B78D4)", borderRadius: 999 }} />
        </div>

        <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5" style={{ background: "white" }}>
          <div
            className="flex items-center justify-center rounded-xl"
            style={{
              width: 36,
              height: 36,
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
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 11, color: palette.muted }}>Floor {bathroom.floor}</span>
              <WashroomBadge type={bathroom.washroom_type} />
            </div>
          </div>
        </div>
      </div>

      <div className="phone-scroll flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-3">
          {categoryMeta.map(category => {
            const stored = ratings[category.key] ?? 0;
            const preview = hovered?.key === category.key ? hovered.value : null;
            const shown = preview ?? stored;
            return (
              <div key={category.key} className="rounded-2xl p-4" style={{ background: "white" }}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 18 }}>{category.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: palette.charcoal }}>{category.label}</div>
                      <div style={{ fontSize: 11, color: palette.muted }}>{category.desc}</div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: shown ? scoreColor(shown * 2) : palette.faint,
                      minWidth: 40,
                      textAlign: "right",
                    }}
                  >
                    {shown ? STAR_LABELS[shown] : "—"}
                  </div>
                </div>

                <div className="mt-1 flex justify-center gap-1.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onMouseEnter={() => setHovered({ key: category.key, value: star })}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => setRatings(current => ({ ...current, [category.key]: star }))}
                      className="transition-transform active:scale-90"
                      style={{ transform: shown >= star ? "scale(1.05)" : "scale(1)" }}
                    >
                      <StarIcon
                        filled={shown >= star}
                        color={shown >= 4 ? "#3DBF82" : shown >= 3 ? "#5B8FE8" : "#F5A623"}
                      />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="rounded-2xl p-4" style={{ background: "white" }}>
            <div className="mb-3 flex items-center gap-2">
              <span style={{ fontSize: 18 }}>📝</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: palette.charcoal }}>Leave a note</div>
                <div style={{ fontSize: 11, color: palette.muted }}>Optional — share what stood out</div>
              </div>
            </div>
            <textarea
              placeholder="e.g. Always clean, great soap dispensers. The hand dryer is a bit loud."
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              className="w-full resize-none outline-none"
              style={{
                borderRadius: 12,
                background: palette.bg,
                border: `1.5px solid ${palette.border}`,
                padding: "10px 14px",
                fontSize: 14,
                color: palette.charcoal,
                fontFamily: "inherit",
                lineHeight: 1.5,
              }}
              onFocus={e => {
                e.target.style.borderColor = palette.periwinkle;
                e.target.style.boxShadow = "0 0 0 3px #7B8CDE18";
              }}
              onBlur={e => {
                e.target.style.borderColor = palette.border;
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {/* The bucket. Picks the band the duel will search. */}
          <div className="rounded-2xl p-4" style={{ background: "white" }}>
            <div className="mb-3">
              <div style={{ fontSize: 14, fontWeight: 700, color: palette.charcoal }}>Overall, how was it?</div>
              <div style={{ fontSize: 11, color: palette.muted }}>
                We'll compare it against your other {bucket ? BUCKET_LABELS[bucket].toLowerCase() : "…"} picks next
              </div>
            </div>
            <div className="flex gap-2">
              {BUCKET_ORDER.map(option => {
                const style = BUCKET_STYLE[option];
                const active = bucket === option;
                return (
                  <button
                    key={option}
                    onClick={() => setBucket(option)}
                    className="flex-1 py-3 transition-all active:scale-95"
                    style={{
                      borderRadius: 16,
                      background: active ? style.bg : palette.bg,
                      border: active ? `2px solid ${style.color}` : "2px solid transparent",
                    }}
                  >
                    <div style={{ fontSize: 22 }}>{style.emoji}</div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: active ? style.color : palette.muted,
                        marginTop: 4,
                      }}
                    >
                      {BUCKET_LABELS[option]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-8 pt-4" style={{ background: palette.bg, borderTop: `1px solid ${palette.border}` }}>
        <button
          onClick={() => {
            if (!ready || !bucket) return;
            onContinue({ bathroom, ratings: ratings as Ratings, note: note.trim() || null, bucket });
          }}
          disabled={!ready}
          className="w-full py-4 transition-all active:opacity-80"
          style={{
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 700,
            background: ready ? gradient.primary : palette.border,
            color: ready ? "white" : palette.faint,
            boxShadow: ready ? "0 4px 20px #7B8CDE44" : "none",
          }}
        >
          {!complete ? "Rate all 5 categories to continue" : !bucket ? "Pick an overall verdict" : "Submit & Compare →"}
        </button>
      </div>
    </div>
  );
}
