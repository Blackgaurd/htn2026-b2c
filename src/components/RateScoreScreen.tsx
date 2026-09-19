/**
 * Step 2 of rating: the verdict, then anything else you care to record.
 *
 * The verdict is three buttons, Good / OK / Bad, in the three colours a score is
 * ever printed in. It used to be five stars, which asked for a precision the
 * answer doesn't have: the stars only ever chose a band, and the duel decides
 * everything inside it, so four and five stars meant exactly the same thing.
 * Three buttons say that honestly, and they're the same three tiers the score
 * colours already mean.
 *
 * Everything below it is deliberately inert: cleanliness, smell and the rest are
 * notes about the room, not a second scoring system. Shown expanded rather than
 * behind a disclosure, since a control you have to discover gets used by nobody.
 *
 * No explanatory grey text. Every line of it restated a heading ("Optional",
 * "Share what stood out", "Up to 2"), and a screen that murmurs under each of
 * its own labels reads as unsure of them.
 */

import { useRef, useState } from "react";
import type { Bathroom, Bucket, Rating, ReviewDetails } from "../../shared/api";
import { BUCKET_LABELS, BUCKET_ORDER, MAX_REVIEW_PHOTOS, detailKeysFor, ratingForBucket } from "../../shared/api";
import type { ReviewDraft } from "../lib/duel";
import { detailMeta, gradient, locationOf, palette, scoreScale } from "../lib/display";
import { BackButton, Notice, WashroomBadge } from "./chrome";
import { StarIcon } from "./icons";

const STARS: Rating[] = [1, 2, 3, 4, 5];

/** Green, yellow, red: the same three colours a finished score is printed in. */
const VERDICT_COLOR: Record<Bucket, string> = {
  loved: scoreScale.good,
  fine: scoreScale.ok,
  never: scoreScale.bad,
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
  const [verdict, setVerdict] = useState<Bucket | null>(null);
  const [details, setDetails] = useState<ReviewDetails>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const keys = detailKeysFor(bathroom.washroom_type);

  function addPhotos(files: FileList | null) {
    setPhotoError(null);
    if (!files?.length) return;

    const room = MAX_REVIEW_PHOTOS - photos.length;
    if (room <= 0) {
      setPhotoError(`Up to ${MAX_REVIEW_PHOTOS} photos.`);
      return;
    }

    for (const file of Array.from(files).slice(0, room)) {
      // Read to a data URL: there's no upload endpoint, and the review carries
      // its own images so a mock demo shows real pictures.
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") setPhotos(current => [...current, result].slice(0, MAX_REVIEW_PHOTOS));
      };
      reader.onerror = () => setPhotoError("Couldn't read that image.");
      reader.readAsDataURL(file);
    }
  }

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="px-5 pb-5 pt-14" style={{ background: gradient.wash, borderRadius: "0 0 24px 24px" }}>
        <div className="mb-4">
          <BackButton onClick={onBack} />
        </div>

        <div className="rounded-2xl px-4 py-3" style={{ background: "white" }}>
          <div className="mb-1.5">
            <WashroomBadge type={bathroom.washroom_type} size="md" />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: palette.charcoal, lineHeight: 1.35 }}>
            {locationOf(bathroom)}
          </div>
        </div>
      </div>

      <div className="phone-scroll flex-1 overflow-y-auto px-5 py-5">
        <div className="rounded-2xl px-4 py-6" style={{ background: "white" }}>
          <div className="text-center" style={{ fontSize: 16, fontWeight: 800, color: palette.charcoal }}>
            How was it?
          </div>

          <div className="mt-5 flex gap-2">
            {BUCKET_ORDER.map(bucket => {
              const color = VERDICT_COLOR[bucket];
              const on = verdict === bucket;
              return (
                <button
                  key={bucket}
                  onClick={() => setVerdict(bucket)}
                  className="flex-1 py-3.5 transition-all active:scale-95"
                  style={{
                    borderRadius: 14,
                    fontSize: 15,
                    fontWeight: 800,
                    background: on ? color : `${color}14`,
                    color: on ? "white" : color,
                    border: `1.5px solid ${on ? color : "transparent"}`,
                  }}
                >
                  {BUCKET_LABELS[bucket]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 rounded-2xl p-4" style={{ background: "white" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: palette.charcoal }}>Rate the details</div>

          <div className="mt-1">
            {keys.map(key => {
              const meta = detailMeta[key];
              const value = details[key] ?? 0;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between py-2.5"
                  style={{ borderTop: `1px solid ${palette.border}` }}
                >
                  <div className="min-w-0 pr-3" style={{ fontSize: 13, fontWeight: 600, color: palette.charcoal }}>
                    {meta?.label ?? key}
                  </div>
                  <div className="flex flex-shrink-0 gap-1">
                    {STARS.map(star => (
                      <button
                        key={star}
                        onClick={() => setDetails(current => ({ ...current, [key]: star }))}
                        className="active:scale-90"
                      >
                        <StarIcon filled={value >= star} size={17} />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3 rounded-2xl p-4" style={{ background: "white" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: palette.charcoal }}>Photos</div>

          <div className="mt-3 flex flex-wrap gap-2">
            {photos.map((src, index) => (
              <div key={index} className="relative">
                <img
                  src={src}
                  alt=""
                  style={{ width: 76, height: 76, borderRadius: 12, objectFit: "cover", display: "block" }}
                />
                <button
                  onClick={() => setPhotos(current => current.filter((_, i) => i !== index))}
                  className="absolute -right-1.5 -top-1.5 flex items-center justify-center"
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: palette.charcoal,
                    color: "white",
                    fontSize: 12,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}

            {photos.length < MAX_REVIEW_PHOTOS && (
              <button
                onClick={() => fileInput.current?.click()}
                className="flex items-center justify-center active:opacity-70"
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 12,
                  border: `1.5px dashed ${palette.periwinkleMid}`,
                  color: palette.periwinkleDeep,
                  fontSize: 12,
                  fontWeight: 700,
                  background: palette.bg,
                }}
              >
                + Add
              </button>
            )}
          </div>

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={e => {
              addPhotos(e.target.files);
              e.target.value = "";
            }}
          />

          {photoError && (
            <div className="mt-2">
              <Notice tone="error">{photoError}</Notice>
            </div>
          )}
        </div>

        <div className="mt-3 rounded-2xl p-4" style={{ background: "white" }}>
          <div className="mb-3" style={{ fontSize: 14, fontWeight: 700, color: palette.charcoal }}>
            Leave a note
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
      </div>

      <div className="px-5 pb-8 pt-4" style={{ background: palette.bg, borderTop: `1px solid ${palette.border}` }}>
        <button
          onClick={() => {
            if (verdict === null) return;
            // The button *is* the band; `rating` is the stored input that band
            // maps back to, so nothing downstream has to know which control
            // produced it.
            onContinue({
              bathroom,
              rating: ratingForBucket(verdict),
              details,
              photos,
              note: note.trim() || null,
              bucket: verdict,
            });
          }}
          disabled={verdict === null}
          className="w-full py-4 transition-all active:opacity-80"
          style={{
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 700,
            background: verdict === null ? palette.border : gradient.primary,
            color: verdict === null ? palette.faint : "white",
            boxShadow: verdict === null ? "none" : "0 4px 20px #7B8CDE44",
          }}
        >
          {verdict === null ? "Pick a rating to continue" : "Submit & Compare →"}
        </button>
      </div>
    </div>
  );
}
