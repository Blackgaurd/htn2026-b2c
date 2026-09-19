/**
 * The payoff: the score the duel produced, and where it landed.
 *
 * The list underneath is a window around the new entry rather than the top five,
 * so you can see what it beat and what beat it. Every score shown is freshly
 * recomputed, inserting near the top really does nudge everything below, and this
 * is the screen where that's visible.
 */

import { useEffect, useState } from "react";
import type { SubmitReviewResult } from "../../shared/api";
import { gradient, locationOf, palette, scoreColor, scoreLabel } from "../lib/display";
import { ScoreChip, WashroomBadge } from "./chrome";

const CONFETTI = ["#7B8CDE", "#9B78D4", "#7B8CDE", "#9B78D4", "#7B8CDE"];

export function CompareResultScreen({ result, onDone }: { result: SubmitReviewResult; onDone: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const [listVisible, setListVisible] = useState(false);

  useEffect(() => {
    const first = setTimeout(() => setRevealed(true), 300);
    const second = setTimeout(() => setListVisible(true), 900);
    return () => {
      clearTimeout(first);
      clearTimeout(second);
    };
  }, []);

  const { review, rank, previous_score, rankings } = result;
  const landed = rankings.find(entry => entry.review_id === review.id);
  const delta = previous_score === null ? null : Math.round((review.score - previous_score) * 10) / 10;

  // Five rows centred on the new entry, clamped to the ends of the list.
  const index = rankings.findIndex(entry => entry.review_id === review.id);
  const start = Math.max(0, Math.min(index - 2, rankings.length - 5));
  const window = rankings.slice(Math.max(start, 0), Math.max(start, 0) + 5);

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="px-5 pb-6 pt-14" style={{ background: gradient.celebrate, borderRadius: "0 0 32px 32px" }}>
        <div className="mb-4 flex justify-center gap-2">
          {CONFETTI.map((color, i) => (
            <div
              key={color}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
                transform: revealed ? "translateY(0) scale(1)" : "translateY(10px) scale(0)",
                opacity: revealed ? 1 : 0,
                transition: `all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 60}ms`,
              }}
            />
          ))}
        </div>

        <div className="text-center">
          <p style={{ fontSize: 13, fontWeight: 700, color: palette.muted, letterSpacing: "0.1em", marginBottom: 8 }}>
            YOUR SCORE
          </p>

          {/* No "/10" hanging off it. The number is the score, the colour says
              what it means, and the denominator was the only thing on this
              screen nobody needed told twice. */}
          <div className="flex items-center justify-center" style={{ height: 100 }}>
            <div
              style={{
                fontSize: 84,
                fontWeight: 800,
                lineHeight: 1,
                color: scoreColor(review.score),
                transform: revealed ? "scale(1) translateY(0)" : "scale(0.6) translateY(20px)",
                opacity: revealed ? 1 : 0,
                transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s",
                letterSpacing: "-3px",
              }}
            >
              {review.score.toFixed(1)}
            </div>
          </div>

          <div
            className="mt-1 flex items-center justify-center gap-3"
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateY(0)" : "translateY(8px)",
              transition: "all 0.4s ease 0.5s",
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 800, color: scoreColor(review.score) }}>
              {scoreLabel(review.score)}
            </span>
            <span
              className="rounded-full px-3 py-1"
              style={{ background: "#7B8CDE22", color: palette.periwinkleDeep, fontSize: 13, fontWeight: 700 }}
            >
              #{rank} of {rankings.length}
            </span>
            {delta !== null && delta !== 0 && (
              <span
                className="rounded-full px-3 py-1"
                style={{
                  background: delta > 0 ? "#3DBF8222" : "#E8736D22",
                  color: delta > 0 ? "#3DBF82" : "#E8736D",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {delta > 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}
              </span>
            )}
          </div>

          <p
            style={{
              fontSize: 13,
              color: palette.muted,
              marginTop: 8,
              fontWeight: 500,
              opacity: revealed ? 1 : 0,
              transition: "opacity 0.4s ease 0.6s",
            }}
          >
            {landed ? locationOf(landed.bathroom) : ""}
          </p>
        </div>
      </div>

      <div className="phone-scroll flex-1 overflow-y-auto px-5 py-5">
        <h3
          className="mb-3"
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: palette.charcoal,
            opacity: listVisible ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}
        >
          Your rankings
        </h3>

        <div
          className="flex flex-col gap-2"
          style={{ opacity: listVisible ? 1 : 0, transition: "opacity 0.5s ease 0.1s" }}
        >
          {window.map((entry, i) => {
            const isNew = entry.review_id === review.id;
            return (
              <div
                key={entry.review_id}
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{
                  background: isNew ? gradient.wash : "white",
                  border: isNew ? `2px solid ${palette.periwinkle}` : "2px solid transparent",
                  transform: listVisible ? "translateX(0)" : "translateX(-16px)",
                  opacity: listVisible ? 1 : 0,
                  transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 70}ms`,
                  boxShadow: isNew ? "0 4px 20px #7B8CDE22" : "0 1px 4px #0000000A",
                }}
              >
                <div
                  className="flex flex-shrink-0 items-center justify-center"
                  style={{ width: 22, fontSize: 13, fontWeight: 700, color: palette.faint }}
                >
                  {entry.rank}
                </div>

                {/* Badge first, then the name: the same order as a tile
                    everywhere else in the app. */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1">
                    <WashroomBadge type={entry.bathroom.washroom_type} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: palette.charcoal, lineHeight: 1.35 }}>
                    {locationOf(entry.bathroom)}
                  </div>
                </div>

                {/* Left of the score, not right: the score keeps the same x on
                    every row whether or not this is the one you just added. */}
                {isNew && (
                  <div
                    className="flex-shrink-0 rounded-full px-1.5 py-0.5"
                    style={{
                      background: palette.periwinkle,
                      fontSize: 9,
                      fontWeight: 700,
                      color: "white",
                      letterSpacing: "0.05em",
                    }}
                  >
                    NEW
                  </div>
                )}

                <ScoreChip score={entry.score} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-5 pb-8 pt-4" style={{ borderTop: `1px solid ${palette.border}`, background: palette.bg }}>
        <button
          onClick={onDone}
          className="w-full py-4 transition-opacity active:opacity-80"
          style={{
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 700,
            color: "white",
            background: gradient.primary,
            boxShadow: "0 4px 20px #7B8CDE44",
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
