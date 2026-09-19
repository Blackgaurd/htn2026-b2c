/**
 * The duel: where a score actually comes from.
 *
 * Left or right, not top and bottom. "Which was better" is a symmetrical question
 * and a stacked pair answers it badly: the top card reads as the default and your
 * thumb travels further to disagree with it. Side by side, neither is first.
 *
 * The two cards are a fixed height rather than stretched to the screen. Filling
 * the page made each one a tall column of mostly nothing, with the two names far
 * enough apart to need a second look; sized to their contents they read as a
 * pair, and both sit under the thumb.
 *
 * The pick is applied on the same tick you tap. There used to be a half-second
 * pause to show a checkmark, which on a three-question run meant a second and a
 * half of watching an animation you'd already finished thinking about.
 */

import { useEffect, useState } from "react";
import type { SubmitReviewResult, WashroomType } from "../../shared/api";
import { BUCKET_LABELS } from "../../shared/api";
import { listMyRankings, submitReview } from "../api";
import type { Duel, ReviewDraft } from "../lib/duel";
import { answerDuel, duelDone, duelOpponent, duelPosition, duelTotalRounds, skipDuel, startDuel } from "../lib/duel";
import { locationOf, palette, scoreColor } from "../lib/display";
import { BackButton, LoadingScreen, Notice, Spinner, WashroomBadge } from "./chrome";

export function CompareScreen({
  draft,
  onBack,
  onDone,
}: {
  draft: ReviewDraft;
  onBack: () => void;
  onDone: (result: SubmitReviewResult) => void;
}) {
  const [duel, setDuel] = useState<Duel | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    listMyRankings().then(
      rankings => {
        if (!live) return;
        const opponents = rankings.filter(
          entry => entry.bucket === draft.bucket && entry.bathroom.id !== draft.bathroom.id,
        );
        setDuel(startDuel(opponents));
      },
      (err: unknown) => live && setError(err instanceof Error ? err.message : String(err)),
    );
    return () => {
      live = false;
    };
  }, [draft.bucket, draft.bathroom.id]);

  useEffect(() => {
    if (!duel || !duelDone(duel) || submitting) return;
    setSubmitting(true);
    submitReview({
      bathroom_id: draft.bathroom.id,
      rating: draft.rating,
      details: draft.details,
      photos: draft.photos,
      note: draft.note,
      position: duelPosition(duel),
    }).then(onDone, (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    });
  }, [duel, submitting, draft, onDone]);

  if (error) {
    return (
      <div className="flex h-full flex-col gap-4 px-5 pt-14" style={{ background: palette.bg }}>
        <BackButton onClick={onBack} />
        <Notice tone="error">{error}</Notice>
      </div>
    );
  }

  if (!duel) return <LoadingScreen />;

  const opponent = duelOpponent(duel);

  if (!opponent || submitting) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4" style={{ background: palette.bg }}>
        <Spinner size={28} />
        <p style={{ fontSize: 14, fontWeight: 600, color: palette.muted }}>Placing it in your ranking…</p>
      </div>
    );
  }

  const total = Math.max(duelTotalRounds(duel), duel.asked + 1);

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="px-5 pb-4 pt-14">
        <div className="mb-4 flex items-center justify-between">
          <BackButton onClick={onBack} />
          <p style={{ fontSize: 11, fontWeight: 700, color: palette.muted, letterSpacing: "0.08em" }}>
            {BUCKET_LABELS[draft.bucket].toUpperCase()}
          </p>
        </div>

        <div className="flex justify-center gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === duel.asked ? 24 : 8,
                height: 8,
                borderRadius: 999,
                background: i < duel.asked ? palette.periwinkle : i === duel.asked ? palette.charcoal : palette.border,
                transition: "all 0.25s ease",
              }}
            />
          ))}
        </div>

        <p className="mt-4 text-center" style={{ fontSize: 22, fontWeight: 800, color: palette.charcoal }}>
          Which was better?
        </p>
      </div>

      {/* Equal halves, equal weight. Neither side is the default. */}
      <div className="flex flex-1 items-center gap-2.5 px-5 pb-4">
        <DuelCard
          title={locationOf(draft.bathroom)}
          washroomType={draft.bathroom.washroom_type}
          caption="Rating now"
          onChoose={() => setDuel(current => (current ? answerDuel(current, true) : current))}
        />

        <span
          className="flex-shrink-0"
          style={{ fontSize: 11, fontWeight: 800, color: palette.faint, letterSpacing: "0.08em" }}
        >
          OR
        </span>

        <DuelCard
          title={locationOf(opponent.bathroom)}
          washroomType={opponent.bathroom.washroom_type}
          caption={`#${opponent.rank} on your list`}
          score={opponent.score}
          onChoose={() => setDuel(current => (current ? answerDuel(current, false) : current))}
        />
      </div>

      <div className="flex justify-center px-5 pb-8">
        <button
          onClick={() => setDuel(current => (current ? skipDuel(current) : current))}
          className="px-5 py-2.5 active:opacity-70"
          style={{
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            color: palette.muted,
            background: "white",
            border: `1.5px solid ${palette.border}`,
          }}
          title="Stop comparing and put it at the bottom of this band"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

function DuelCard({
  title,
  washroomType,
  caption,
  score,
  onChoose,
}: {
  title: string;
  washroomType: WashroomType;
  caption: string;
  score?: number;
  onChoose: () => void;
}) {
  return (
    <button
      onClick={onChoose}
      className="flex flex-1 flex-col items-center justify-center px-3.5 text-center transition-transform active:scale-[0.97]"
      style={{
        height: 216,
        borderRadius: 22,
        background: "white",
        border: `2px solid ${palette.border}`,
        boxShadow: "0 2px 14px #0000000D",
        minWidth: 0,
      }}
    >
      <WashroomBadge type={washroomType} />

      <div
        className="mt-2.5"
        style={{ fontSize: 14, fontWeight: 700, color: palette.charcoal, lineHeight: 1.35, overflowWrap: "anywhere" }}
      >
        {title}
      </div>

      <div
        className="mt-3 tabular-nums"
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: score === undefined ? palette.faint : scoreColor(score),
          lineHeight: 1,
        }}
      >
        {score === undefined ? "–" : score.toFixed(1)}
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: palette.faint, marginTop: 6 }}>{caption}</div>
    </button>
  );
}
