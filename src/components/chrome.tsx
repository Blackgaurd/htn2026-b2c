/**
 * The pieces every püpi screen is built out of.
 *
 * Presentational only, they take contract types and render them. None of them
 * fetch, and none of them decide what a user may see; that arrives already
 * filtered from `../api`.
 */

import type { ReactNode } from "react";
import type { Bathroom, DetailAverages, ReviewRow, UserSummary, WashroomType } from "../../shared/api";
import { DETAIL_KEYS, detailKeysFor } from "../../shared/api";
import { detailMeta, gradient, initials, locationOf, palette, scoreColor, washroomMeta } from "../lib/display";
import { BookmarkIcon, HomeIcon, PinIcon, PlusIcon, ProfileIcon, StarIcon, TrophyIcon } from "./icons";

// ─── Badges ───────────────────────────────────────────────────────────────────

/**
 * Which washroom this is. Deliberately impossible to miss: it's what makes the
 * friends feed legible when it shows you a type you don't use.
 */
export function WashroomBadge({ type, size = "sm" }: { type: WashroomType; size?: "sm" | "md" }) {
  const meta = washroomMeta[type];
  return (
    <span
      className="inline-flex items-center rounded-full"
      style={{
        color: meta.color,
        background: meta.bg,
        fontSize: size === "md" ? 12 : 11,
        fontWeight: 600,
        padding: size === "md" ? "3px 9px" : "2px 8px",
        whiteSpace: "nowrap",
      }}
    >
      {meta.label}
    </span>
  );
}

export function ScoreChip({ score, label = "Not rated" }: { score: number | null; label?: string }) {
  if (score === null) {
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-1"
        style={{ color: palette.faint, background: "#F5F4F0", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" }}
      >
        {label}
      </span>
    );
  }
  const color = scoreColor(score);
  return (
    <span
      className="inline-flex items-center rounded-full tabular-nums"
      style={{ color, background: `${color}1A`, fontSize: 13, fontWeight: 700, padding: "4px 10px" }}
    >
      {score.toFixed(1)}
    </span>
  );
}

export function Avatar({ user, size = 36 }: { user: Pick<UserSummary, "display_name" | "avatar_color">; size?: number }) {
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `${user.avatar_color}22`,
        color: user.avatar_color,
        fontSize: size > 40 ? 16 : 13,
        fontWeight: 700,
      }}
    >
      {initials(user.display_name)}
    </div>
  );
}

// ─── Rows ─────────────────────────────────────────────────────────────────────

/**
 * A washroom, as a row. **The** washroom row: rankings, search, near me, saved,
 * a profile's activity and the feed's inner card are all this component.
 *
 * They were six near-identical blocks that had drifted, different paddings,
 * different score treatments, a bookmark button that hung outside the card on
 * one screen and didn't exist on the others. One component means a change to how
 * a washroom looks happens once, and a tile can't be missing a control just
 * because its screen was written on a different day.
 *
 * Everything optional is off by default, so a plain `<BathroomTile bathroom />`
 * is still a legible row:
 *
 * - `rank` prefixes the position number (rankings, activity).
 * - `mine` is your own score; without it only the campus average has a number.
 * - `meta` is a small line by the badge (distance, time, whatever the screen has).
 * - `onToggleBookmark` lights up the bookmark. Omit it for a read-only tile.
 * - `canUse === false` is a washroom outside your preference: it keeps the badge
 *   that says so and loses every control, silently, because the badge already
 *   said it and a sentence underneath said it twice.
 * - `details` prints the campus detail averages under the name.
 */
export function BathroomTile({
  bathroom,
  onPress,
  selected,
  raised,
  mine,
  rank,
  meta,
  details,
  canUse = true,
  showScores = true,
  bookmarked,
  onToggleBookmark,
  footer,
}: {
  bathroom: Bathroom;
  onPress?: () => void;
  selected?: boolean;
  /** Gives a nested tile enough depth to read as a separate surface. */
  raised?: boolean;
  /** Your personal score. Undefined prints a dash under YOURS, same as null. */
  mine?: number | null;
  rank?: number;
  meta?: ReactNode;
  details?: boolean;
  canUse?: boolean;
  /** Feed cards already show the review score; omit the comparison pair there. */
  showScores?: boolean;
  /** Defaults to the row's own `bookmarked`; pass it only to override. */
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
  footer?: ReactNode;
}) {
  const on = bookmarked ?? bathroom.bookmarked;
  const body = (
    <>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <WashroomBadge type={bathroom.washroom_type} />
        {meta && <span style={{ fontSize: 11, fontWeight: 600, color: palette.faint }}>{meta}</span>}
      </div>
      {/* Never truncated: the tail of the name is the part that distinguishes
          this washroom from the one on the next floor. */}
      <div style={{ color: palette.charcoal, fontWeight: 600, fontSize: 14, lineHeight: 1.35 }}>
        {locationOf(bathroom)}
      </div>
    </>
  );

  return (
    <div
      className="px-4 py-3.5"
      style={{
        background: selected ? palette.periwinkleLight : "white",
        borderRadius: 16,
        border: selected ? `2px solid ${palette.periwinkle}` : "2px solid transparent",
        boxShadow: selected ? "0 4px 16px #7B8CDE22" : raised ? "0 4px 12px #292B4518" : "0 1px 4px #0000000A",
      }}
    >
      <div className="flex items-start gap-3">
        {rank !== undefined && (
          <div
            className="flex-shrink-0 tabular-nums"
            style={{ width: 22, fontSize: 14, fontWeight: 700, color: palette.faint, paddingTop: 2 }}
          >
            {rank}
          </div>
        )}

        {onPress ? (
          <button onClick={onPress} className="min-w-0 flex-1 text-left active:opacity-70">
            {body}
          </button>
        ) : (
          <div className="min-w-0 flex-1">{body}</div>
        )}

        <div className="flex flex-shrink-0 items-start gap-2">
          {showScores && <ScorePair mine={mine} average={bathroom.global_score} />}
          {canUse && onToggleBookmark && (
            <BookmarkButton on={on} onToggle={onToggleBookmark} size={32} />
          )}
        </div>
      </div>

      {details && <DetailAverageRow averages={bathroom.detail_averages} />}
      {footer}
    </div>
  );
}

/**
 * What everyone thought of the details, as an average.
 *
 * Shown where you're choosing a washroom rather than reading about one, because
 * "is it clean" is the question a search is actually asking. Stars round to the
 * nearest whole for the shape, the number beside them is the real average, and
 * neither is anywhere near `global_score`.
 */
export function DetailAverageRow({ averages }: { averages: DetailAverages }) {
  const shown = DETAIL_KEYS.filter(key => averages[key] !== undefined);
  if (shown.length === 0) return null;

  return (
    <div
      className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 pt-2.5"
      style={{ borderTop: `1px solid ${palette.border}` }}
    >
      {shown.map(key => {
        const value = averages[key] ?? 0;
        return (
          <div key={key} className="flex min-w-0 items-center justify-between gap-1.5">
            <span style={{ fontSize: 11, fontWeight: 600, color: palette.muted }}>
              {detailMeta[key]?.label ?? key}
            </span>
            <span className="flex gap-px">
              {[1, 2, 3, 4, 5].map(star => (
                <StarIcon key={star} filled={Math.round(value) >= star} size={10} />
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Layout bits ──────────────────────────────────────────────────────────────

/**
 * The two numbers a bathroom has, side by side and named.
 *
 * They are never the same thing: AVG is what everyone thinks, YOURS is where it
 * sits in your own ranking. A dash means you haven't rated it, not a zero, and
 * not a "new" badge, which said something about the row rather than the score.
 */
export function ScorePair({ mine, average }: { mine: number | null | undefined; average: number | null }) {
  return (
    <div className="flex items-start gap-1.5 text-right">
      <ScoreCell label="AVG" value={average} />
      <ScoreCell label="YOURS" value={mine ?? null} />
    </div>
  );
}

function ScoreCell({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex flex-col items-center" style={{ minWidth: 34 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: palette.faint, letterSpacing: "0.04em" }}>{label}</div>
      <div
        className="mt-1 flex items-center justify-center rounded-full tabular-nums"
        style={{
          width: 34,
          height: 34,
          fontSize: 13,
          fontWeight: 800,
          color: value === null ? palette.faint : scoreColor(value),
          border: `1px solid ${palette.border}`,
          background: "white",
        }}
      >
        {value === null ? "–" : value.toFixed(1)}
      </div>
    </div>
  );
}

/**
 * The detail stars *one person* gave, as opposed to `DetailAverageRow`, which is
 * everybody's. Same rule applies to both: notes about the room, never summed,
 * never anywhere near the score.
 */
export function ReviewDetails({ review, type }: { review: ReviewRow; type: WashroomType }) {
  const shown = detailKeysFor(type).filter(key => review[key] != null);
  if (shown.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
      {shown.map(key => (
        <div key={key} className="flex min-w-0 items-center justify-between gap-1.5">
          <span style={{ fontSize: 11.5, fontWeight: 600, color: palette.muted }}>
            {detailMeta[key]?.label ?? key}
          </span>
          <span className="flex gap-px">
            {[1, 2, 3, 4, 5].map(star => (
              <StarIcon key={star} filled={(review[key] ?? 0) >= star} size={11} />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Review photos, as a wrapping grid. There can be up to `MAX_REVIEW_PHOTOS`. */
export function PhotoStrip({ photos, size = 84 }: { photos: string[]; size?: number }) {
  if (photos.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((src, index) => (
        <img
          key={index}
          src={src}
          alt=""
          style={{ width: size, height: size, borderRadius: 12, objectFit: "cover", display: "block" }}
        />
      ))}
    </div>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="active:opacity-60"
      style={{ fontSize: 14, fontWeight: 600, color: palette.periwinkleDeep }}
    >
      ← Back
    </button>
  );
}

export function BookmarkButton({
  on,
  onToggle,
  size = 38,
  circular = false,
}: {
  on: boolean;
  onToggle: () => void;
  size?: number;
  /** Compact header actions use the same control with a circular hit area. */
  circular?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={on ? "Remove bookmark" : "Bookmark"}
      title={on ? "Bookmarked" : "Bookmark"}
      className="flex flex-shrink-0 items-center justify-center active:opacity-70"
      style={{
        width: size,
        height: size,
        borderRadius: circular ? "50%" : 12,
        background: circular ? "transparent" : "white",
        border: "none",
      }}
    >
      <BookmarkIcon filled={on} size={size > 34 ? 20 : 17} />
    </button>
  );
}

export function PrimaryButton({
  onClick,
  disabled,
  children,
  tone = "primary",
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  tone?: "primary" | "dark";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-4 transition-all active:opacity-80"
      style={{
        borderRadius: 16,
        fontSize: 16,
        fontWeight: 700,
        background: disabled ? palette.border : tone === "dark" ? gradient.dark : gradient.primary,
        color: disabled ? palette.faint : "white",
        boxShadow: disabled ? "none" : tone === "dark" ? "0 4px 16px #1C1C2E33" : "0 4px 20px #7B8CDE44",
      }}
    >
      {children}
    </button>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  onFocus,
  autoFocus,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  onFocus?: () => void;
  autoFocus?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-3"
      style={{ background: "white", borderRadius: 14, border: `1.5px solid ${palette.border}` }}
    >
      <input
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        autoFocus={autoFocus}
        className="flex-1 bg-transparent outline-none"
        style={{ fontSize: 15, color: palette.charcoal, fontFamily: "inherit" }}
      />
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  activeColor = palette.periwinkle,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  activeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 rounded-full px-4 py-1.5 transition-all"
      style={{
        fontSize: 13,
        fontWeight: 600,
        background: active ? activeColor : "white",
        color: active ? "white" : palette.muted,
        border: active ? "none" : `1.5px solid ${palette.border}`,
      }}
    >
      {children}
    </button>
  );
}

/** Two-up segmented control, used for the list and profile tabs. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex gap-1 p-1" style={{ background: "#EFEDE7", borderRadius: 14 }}>
      {options.map(option => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className="flex-1 py-2 transition-all"
          style={{
            borderRadius: 11,
            fontSize: 13,
            fontWeight: 700,
            background: value === option.id ? "white" : "transparent",
            color: value === option.id ? palette.charcoal : palette.muted,
            boxShadow: value === option.id ? "0 1px 4px #00000012" : "none",
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A one-of-N filter that stays one line tall.
 *
 * A native `<select>` on purpose: it opens the platform's own picker, so there is
 * no popover of ours to position, dismiss or animate, and no tap that has to wait
 * for React before anything visible happens.
 */
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (next: T) => void;
  /** Read out to assistive tech; the chosen option is the only visible text. */
  label: string;
}) {
  return (
    <div
      className="relative inline-flex items-center"
      style={{ background: "white", borderRadius: 12, border: `1.5px solid ${palette.border}` }}
    >
      <select
        aria-label={label}
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className="appearance-none bg-transparent outline-none"
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: palette.charcoal,
          fontFamily: "inherit",
          padding: "8px 30px 8px 12px",
        }}
      >
        {options.map(option => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute flex items-center justify-center"
        style={{
          right: 7,
          width: 20,
          height: 20,
          borderRadius: 6,
          background: palette.periwinkleLight,
          color: palette.periwinkleDeep,
          fontSize: 13,
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        ▾
      </span>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-14 text-center">
      <div style={{ fontSize: 16, fontWeight: 800, color: palette.charcoal }}>{title}</div>
      <p style={{ fontSize: 13, color: palette.muted, marginTop: 6, lineHeight: 1.5, maxWidth: 260 }}>{body}</p>
      {action && <div className="mt-5 w-full">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error"; children: ReactNode }) {
  const color = tone === "error" ? "#D2544F" : palette.muted;
  return (
    <div
      className="px-4 py-3"
      style={{
        borderRadius: 14,
        background: tone === "error" ? "#FDECEB" : "white",
        color,
        fontSize: 13,
        fontWeight: 500,
        border: `1px solid ${tone === "error" ? "#F6D4D2" : palette.border}`,
      }}
    >
      {children}
    </div>
  );
}

export function Spinner({ size = 18, color = palette.periwinkle }: { size?: number; color?: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${color}`,
        borderTopColor: "transparent",
        animation: "pupi-spin 0.6s linear infinite",
      }}
    />
  );
}

export function LoadingScreen() {
  return (
    <div className="flex h-full items-center justify-center" style={{ background: palette.bg }}>
      <Spinner size={26} />
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

/**
 * Five slots, with the rate button dead centre.
 *
 * The two you reach for mid-errand flank it, Near me on the left, Rankings on
 * the right, so the thumb lands on them without crossing the bar.
 */
export type Tab = "home" | "nearby" | "rankings" | "profile";

const TAB_ICONS: Record<Tab, (props: { active?: boolean }) => ReactNode> = {
  home: HomeIcon,
  nearby: PinIcon,
  rankings: TrophyIcon,
  profile: ProfileIcon,
};

export function TabBar({ active, onSelect, onRate }: { active: Tab; onSelect: (tab: Tab) => void; onRate: () => void }) {
  const left: { id: Tab; label: string }[] = [
    { id: "home", label: "Home" },
    { id: "nearby", label: "Near me" },
  ];
  const right: { id: Tab; label: string }[] = [
    { id: "rankings", label: "Rankings" },
    { id: "profile", label: "Profile" },
  ];

  return (
    <div
      className="flex flex-shrink-0 items-end justify-around px-2 pb-6 pt-2"
      style={{ background: "white", borderTop: `1px solid ${palette.border}` }}
    >
      {left.map(tab => (
        <TabButton key={tab.id} tab={tab} active={active === tab.id} onSelect={onSelect} />
      ))}

      {/* Not a tab, it opens the review flow, which has no tab bar of its own. */}
      <button className="-mt-7 flex flex-col items-center" onClick={onRate}>
        <div
          className="flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: gradient.brand,
            boxShadow: "0 4px 20px #7B8CDE44",
          }}
        >
          <PlusIcon />
        </div>
        <span style={{ color: palette.periwinkleDeep, fontSize: 10, fontWeight: 600, marginTop: 4 }}>Rate</span>
      </button>

      {right.map(tab => (
        <TabButton key={tab.id} tab={tab} active={active === tab.id} onSelect={onSelect} />
      ))}
    </div>
  );
}

function TabButton({
  tab,
  active,
  onSelect,
}: {
  tab: { id: Tab; label: string };
  active: boolean;
  onSelect: (tab: Tab) => void;
}) {
  const Icon = TAB_ICONS[tab.id];
  return (
    <button className="flex flex-col items-center gap-1 px-2 py-1" style={{ minWidth: 58 }} onClick={() => onSelect(tab.id)}>
      <Icon active={active} />
      <span
        style={{
          color: active ? palette.periwinkleDeep : palette.faint,
          fontSize: 10,
          fontWeight: active ? 600 : 400,
        }}
      >
        {tab.label}
      </span>
    </button>
  );
}
