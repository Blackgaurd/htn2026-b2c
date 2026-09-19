/**
 * The duel — where a score actually comes from.
 *
 * The new review is held up against bathrooms already in the same bucket, and each
 * answer halves the remaining range (see `src/lib/duel.ts`), so a bucket of seven
 * costs three taps. When the range closes we know the insert position and that —
 * not a star average — is what `submitReview` is given.
 *
 * With an empty bucket there's nothing to compare against, so it submits straight
 * through at position 0 rather than showing a question with one card.
 */

import { useEffect, useMemo, useState } from "react";
import type { RankedBathroom, SubmitReviewResult } from "../../shared/api";
import { BUCKET_LABELS, ratingsAverage } from "../../shared/api";
import { listMyRankings, submitReview } from "../api";
import type { Duel, ReviewDraft } from "../lib/duel";
import { answerDuel, duelDone, duelOpponent, duelPosition, duelTotalRounds, skipDuel, startDuel } from "../lib/duel";
import { buildingColor, categoryMeta, gradient, palette, scoreColor } from "../lib/display";
import { BackButton, LoadingScreen, Notice, ScoreChip, Spinner, WashroomBadge } from "./chrome";
import { CheckIcon } from "./icons";

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
  const [picked, setPicked] = useState<"new" | "old" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the bucket's existing entries once, then the duel is pure local state.
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

  // Whenever the search window closes, that's the answer — send it.
  useEffect(() => {
    if (!duel || !duelDone(duel) || submitting) return;
    setSubmitting(true);
    submitReview({
      bathroom_id: draft.bathroom.id,
      ratings: draft.ratings,
      note: draft.note,
      bucket: draft.bucket,
      position: duelPosition(duel),
    }).then(onDone, (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    });
  }, [duel, submitting, draft, onDone]);

  const impression = useMemo(() => ratingsAverage(draft.ratings), [draft.ratings]);

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

  const total = duelTotalRounds(duel);

  function choose(side: "new" | "old") {
    if (picked) return;
    setPicked(side);
    // A beat so the checkmark reads, then the next question.
    setTimeout(() => {
      setPicked(null);
      setDuel(current => (current ? answerDuel(current, side === "new") : current));
    }, 520);
  }

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="px-5 pb-4 pt-14">
        <div className="mb-3 flex items-center justify-between">
          <BackButton onClick={onBack} />
          <div className="text-center">
            <p style={{ fontSize: 11, fontWeight: 700, color: palette.muted, letterSpacing: "0.08em" }}>
              {BUCKET_LABELS[draft.bucket].toUpperCase()}
            </p>
            <p style={{ fontSize: 17, fontWeight: 800, color: palette.charcoal }}>
              {duel.asked + 1} of {Math.max(total, duel.asked + 1)}
            </p>
          </div>
          <div style={{ width: 38 }} />
        </div>

        <div className="mb-1 flex justify-center gap-2">
          {Array.from({ length: Math.max(total, duel.asked + 1) }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === duel.asked ? 24 : 8,
                height: 8,
                borderRadius: 999,
                background: i < duel.asked ? "#3DBF82" : i === duel.asked ? palette.periwinkle : palette.border,
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
      </div>

      <div className="mb-4 px-5">
        <div className="rounded-2xl py-3 text-center" style={{ background: gradient.wash }}>
          <p style={{ fontSize: 20, fontWeight: 800, color: palette.charcoal }}>Which was better?</p>
          <p style={{ fontSize: 13, color: palette.muted, marginTop: 2 }}>Tap the one you preferred</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-3 px-5 pb-4">
        <DuelCard
          title={draft.bathroom.location}
          building={draft.bathroom.building}
          floor={draft.bathroom.floor}
          washroomType={draft.bathroom.washroom_type}
          chip={<ScoreChip score={null} label="Rating now" />}
          highlights={topCategories(draft)}
          impression={impression}
          chosen={picked === "new"}
          dimmed={picked === "old"}
          onChoose={() => choose("new")}
        />

        <DuelCard
          title={opponent.bathroom.location}
          building={opponent.bathroom.building}
          floor={opponent.bathroom.floor}
          washroomType={opponent.bathroom.washroom_type}
          chip={<ScoreChip score={opponent.score} />}
          highlights={[]}
          rank={opponent.rank}
          chosen={picked === "old"}
          dimmed={picked === "new"}
          onChoose={() => choose("old")}
        />

        <button
          onClick={() => setDuel(current => (current ? skipDuel(current) : current))}
          style={{ fontSize: 13, fontWeight: 600, color: palette.faint, textAlign: "center", padding: "4px 0" }}
        >
          Skip the rest — put it at the bottom
        </button>
      </div>
    </div>
  );
}

/** The two categories the user felt most strongly about, as a preview on the card. */
function topCategories(draft: ReviewDraft): { icon: string; label: string; value: number }[] {
  return categoryMeta
    .map(category => ({
      icon: category.icon,
      label: category.label,
      value: draft.ratings[category.key] * 2,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 2);
}

function DuelCard({
  title,
  building,
  floor,
  washroomType,
  chip,
  highlights,
  impression,
  rank,
  chosen,
  dimmed,
  onChoose,
}: {
  title: string;
  building: "E5" | "E7";
  floor: number;
  washroomType: RankedBathroom["bathroom"]["washroom_type"];
  chip: React.ReactNode;
  highlights: { icon: string; label: string; value: number }[];
  impression?: number;
  rank?: number;
  chosen: boolean;
  dimmed: boolean;
  onChoose: () => void;
}) {
  return (
    <button
      onClick={onChoose}
      className="w-full text-left"
      style={{
        borderRadius: 24,
        transform: chosen ? "scale(1.02)" : dimmed ? "scale(0.97)" : "scale(1)",
        opacity: dimmed ? 0.45 : 1,
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        style={{
          borderRadius: 24,
          background: chosen ? gradient.wash : "white",
          border: chosen ? `2.5px solid ${palette.periwinkle}` : "2.5px solid transparent",
          boxShadow: chosen ? "0 8px 32px #7B8CDE33" : "0 2px 16px #0000000D",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: 6,
            background: chosen ? "linear-gradient(90deg, #7B8CDE, #9B78D4)" : `${buildingColor(building)}40`,
          }}
        />

        <div className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{
                width: 40,
                height: 40,
                background: `${buildingColor(building)}20`,
                color: buildingColor(building),
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {building}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 12, fontWeight: 600, color: palette.muted }}>Floor {floor}</span>
                <WashroomBadge type={washroomType} />
                {rank !== undefined && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: palette.faint }}>#{rank} on your list</span>
                )}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: palette.charcoal, lineHeight: 1.2, marginTop: 2 }}>
                {title}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {highlights.map(highlight => (
              <div
                key={highlight.label}
                className="flex flex-1 items-center gap-1.5 rounded-xl px-3 py-1.5"
                style={{ background: palette.bg }}
              >
                <span style={{ fontSize: 13 }}>{highlight.icon}</span>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: palette.faint, letterSpacing: "0.05em" }}>
                    {highlight.label.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: scoreColor(highlight.value) }}>
                    {highlight.value.toFixed(1)}
                  </div>
                </div>
              </div>
            ))}
            {impression !== undefined && (
              <div className="flex items-center gap-1.5 rounded-xl px-3 py-1.5" style={{ background: palette.bg }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: palette.faint, letterSpacing: "0.05em" }}>
                    FIRST TAKE
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: scoreColor(impression) }}>
                    {impression.toFixed(1)}
                  </div>
                </div>
              </div>
            )}
            <div
              className="flex items-center justify-center rounded-xl px-3 py-1.5"
              style={{ background: palette.bg, minWidth: 56 }}
            >
              {chip}
            </div>
          </div>

          {chosen && (
            <div className="mt-3 flex items-center gap-2 pt-3" style={{ borderTop: `1px solid ${palette.border}` }}>
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 22, height: 22, background: "#3DBF82" }}
              >
                <CheckIcon />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#3DBF82" }}>Your pick</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
