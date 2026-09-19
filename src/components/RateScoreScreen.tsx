/**
 * Step 2 of rating: the verdict, then anything else you care to record.
 *
 * The star row at the top is the only input that touches the score — it picks the
 * band, and the duel picks the place inside it. Everything below is optional and
 * deliberately inert: cleanliness, smell and the rest are notes about the room, not
 * a second scoring system. They're collapsed by default so the screen asks one
 * question first.
 *
 * Sanitary products are asked about in women's washrooms only; see `detailKeysFor`.
 */

import { useRef, useState } from "react";
import type { Bathroom, Rating, ReviewDetails } from "../../shared/api";
import { BUCKET_LABELS, MAX_REVIEW_PHOTOS, bucketForRating, detailKeysFor } from "../../shared/api";
import type { ReviewDraft } from "../lib/duel";
import { STAR_LABELS, detailMeta, gradient, locationOf, palette } from "../lib/display";
import { BackButton, Notice, WashroomBadge } from "./chrome";
import { StarIcon } from "./icons";

const STARS: Rating[] = [1, 2, 3, 4, 5];

export function RateScoreScreen({
  bathroom,
  onBack,
  onContinue,
}: {
  bathroom: Bathroom;
  onBack: () => void;
  onContinue: (draft: ReviewDraft) => void;
}) {
  const [rating, setRating] = useState<Rating | null>(null);
  const [hovered, setHovered] = useState<Rating | null>(null);
  const [details, setDetails] = useState<ReviewDetails>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const shown = hovered ?? rating ?? 0;
  const keys = detailKeysFor(bathroom.washroom_type);
  const answered = keys.filter(key => details[key] !== undefined).length;

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
        <div className="mb-4 flex items-center gap-3">
          <BackButton onClick={onBack} />
          <p
            className="flex-1 text-right"
            style={{ fontSize: 11, fontWeight: 700, color: palette.muted, letterSpacing: "0.08em" }}
          >
            STEP 2 OF 2
          </p>
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

          <div className="mt-5 flex justify-center gap-3">
            {STARS.map(star => (
              <button
                key={star}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setRating(star)}
                className="transition-transform active:scale-90"
                style={{ transform: shown >= star ? "scale(1.08)" : "scale(1)" }}
              >
                <StarIcon filled={shown >= star} size={36} />
              </button>
            ))}
          </div>

          <div
            className="mt-4 text-center"
            style={{ fontSize: 14, fontWeight: 700, color: shown ? palette.charcoal : palette.faint }}
          >
            {shown ? STAR_LABELS[shown] : "Tap to rate"}
          </div>

          {rating !== null && (
            <div className="mt-1 text-center" style={{ fontSize: 12, color: palette.muted }}>
              We'll compare it against your other “{BUCKET_LABELS[bucketForRating(rating)].toLowerCase()}” picks next
            </div>
          )}
        </div>

        {/* Optional and clearly marked as not counting. */}
        <div className="mt-3 rounded-2xl" style={{ background: "white" }}>
          <button
            onClick={() => setShowDetails(open => !open)}
            className="flex w-full items-center justify-between p-4 text-left"
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: palette.charcoal }}>Rate the details</div>
              <div style={{ fontSize: 11, color: palette.muted }}>
                Optional — these don't affect the score
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: palette.periwinkle }}>
              {answered > 0 ? `${answered}/${keys.length}` : showDetails ? "Hide" : "Add"}
            </span>
          </button>

          {showDetails && (
            <div className="px-4 pb-4">
              {keys.map(key => {
                const meta = detailMeta[key];
                const value = details[key] ?? 0;
                return (
                  <div key={key} className="flex items-center justify-between py-2.5" style={{ borderTop: `1px solid ${palette.border}` }}>
                    <div className="min-w-0 pr-3">
                      <div style={{ fontSize: 13, fontWeight: 600, color: palette.charcoal }}>{meta?.label ?? key}</div>
                      <div style={{ fontSize: 11, color: palette.faint }}>{meta?.hint}</div>
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
          )}
        </div>

        <div className="mt-3 rounded-2xl p-4" style={{ background: "white" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: palette.charcoal }}>Photos</div>
          <div style={{ fontSize: 11, color: palette.muted }}>Optional — up to {MAX_REVIEW_PHOTOS}</div>

          <div className="mt-3 flex gap-2">
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
                  color: palette.periwinkle,
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
          <div className="mb-3">
            <div style={{ fontSize: 14, fontWeight: 700, color: palette.charcoal }}>Leave a note</div>
            <div style={{ fontSize: 11, color: palette.muted }}>Optional — share what stood out</div>
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
            if (rating === null) return;
            onContinue({
              bathroom,
              rating,
              details,
              photos,
              note: note.trim() || null,
              bucket: bucketForRating(rating),
            });
          }}
          disabled={rating === null}
          className="w-full py-4 transition-all active:opacity-80"
          style={{
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 700,
            background: rating === null ? palette.border : gradient.primary,
            color: rating === null ? palette.faint : "white",
            boxShadow: rating === null ? "none" : "0 4px 20px #7B8CDE44",
          }}
        >
          {rating === null ? "Pick a rating to continue" : "Submit & Compare →"}
        </button>
      </div>
    </div>
  );
}
