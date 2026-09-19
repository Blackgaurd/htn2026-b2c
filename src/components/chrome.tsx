/**
 * The pieces every püpi screen is built out of.
 *
 * Presentational only — they take contract types and render them. None of them
 * fetch, and none of them decide what a user may see; that arrives already
 * filtered from `../api`.
 */

import type { ReactNode } from "react";
import type { Bathroom, UserSummary, WashroomType } from "../../shared/api";
import { gradient, initials, locationOf, palette, scoreColor, washroomMeta } from "../lib/display";

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

export function BathroomRow({
  bathroom,
  onPress,
  selected,
  score,
  trailing,
}: {
  bathroom: Bathroom;
  onPress: () => void;
  selected?: boolean;
  /** Your personal score when you have one; falls back to the global score. */
  score?: number | null;
  trailing?: ReactNode;
}) {
  const shown = score === undefined ? bathroom.global_score : score;
  return (
    <button
      onClick={onPress}
      className="flex w-full items-center gap-3 px-4 py-3.5 transition-all active:scale-[0.98]"
      style={{
        background: selected ? palette.periwinkleLight : "white",
        borderRadius: 16,
        textAlign: "left",
        border: selected ? `2px solid ${palette.periwinkle}` : "2px solid transparent",
        boxShadow: selected ? "0 4px 16px #7B8CDE22" : "0 1px 4px #0000000A",
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <WashroomBadge type={bathroom.washroom_type} />
        </div>
        <div style={{ color: palette.charcoal, fontWeight: 600, fontSize: 14, lineHeight: 1.35 }}>
          {locationOf(bathroom)}
        </div>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
        {trailing ?? <ScorePair mine={shown} average={bathroom.global_score} />}
      </div>
    </button>
  );
}

// ─── Layout bits ──────────────────────────────────────────────────────────────

/**
 * The two numbers a bathroom has, side by side and named.
 *
 * They are never the same thing: AVG is what everyone thinks, YOURS is where it
 * sits in your own ranking. A dash means you haven't rated it — not a zero, and
 * not a "new" badge, which said something about the row rather than the score.
 */
export function ScorePair({ mine, average }: { mine: number | null | undefined; average: number | null }) {
  return (
    <div className="flex items-start gap-3 text-right">
      <ScoreCell label="AVG" value={average} />
      <ScoreCell label="YOURS" value={mine ?? null} />
    </div>
  );
}

function ScoreCell({ label, value }: { label: string; value: number | null }) {
  return (
    <div style={{ minWidth: 34 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: palette.faint, letterSpacing: "0.04em" }}>{label}</div>
      <div
        className="tabular-nums"
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: value === null ? palette.faint : scoreColor(value),
          lineHeight: 1.3,
        }}
      >
        {value === null ? "–" : value.toFixed(1)}
      </div>
    </div>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="active:opacity-60"
      style={{ fontSize: 14, fontWeight: 600, color: palette.periwinkle }}
    >
      ← Back
    </button>
  );
}

export function SaveButton({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className="rounded-full px-3 py-1.5 active:opacity-70"
      style={{
        fontSize: 12,
        fontWeight: 700,
        background: on ? palette.periwinkle : "white",
        color: on ? "white" : palette.muted,
        opacity: disabled ? 0.4 : 1,
        border: on ? "none" : `1.5px solid ${palette.border}`,
      }}
    >
      {on ? "Saved" : "Save"}
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
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  onFocus?: () => void;
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
 * Five slots, so the rate button sits in the middle where it belongs.
 *
 * It was four before — two tabs, the button, one tab — which read as off-centre
 * because it was. Saved fills the gap: bookmarks were buried as a tab inside the
 * profile, which is a strange place for a list you open constantly.
 *
 * Labels, not icons. A drawn house and a drawn trophy needed decoding; the words
 * don't.
 */
export type Tab = "home" | "rankings" | "saved" | "profile";

export function TabBar({ active, onSelect, onRate }: { active: Tab; onSelect: (tab: Tab) => void; onRate: () => void }) {
  const left: { id: Tab; label: string }[] = [
    { id: "home", label: "Home" },
    { id: "rankings", label: "Rankings" },
  ];
  const right: { id: Tab; label: string }[] = [
    { id: "saved", label: "Saved" },
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

      {/* Not a tab — it opens the review flow, which has no tab bar of its own. */}
      <button className="-mt-7 flex flex-col items-center" onClick={onRate}>
        <div
          className="flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: gradient.brand,
            boxShadow: "0 4px 20px #7B8CDE44",
            color: "white",
            fontSize: 28,
            fontWeight: 300,
            lineHeight: 1,
            paddingBottom: 3,
          }}
        >
          +
        </div>
        <span style={{ color: palette.periwinkle, fontSize: 10, fontWeight: 600, marginTop: 4 }}>Rate</span>
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
  return (
    <button className="flex flex-col items-center px-2 py-1" style={{ minWidth: 60 }} onClick={() => onSelect(tab.id)}>
      <span
        style={{
          color: active ? palette.periwinkle : palette.faint,
          fontSize: 12,
          fontWeight: active ? 700 : 500,
        }}
      >
        {tab.label}
      </span>
      <span
        style={{
          marginTop: 5,
          width: 16,
          height: 2,
          borderRadius: 2,
          background: active ? palette.periwinkle : "transparent",
        }}
      />
    </button>
  );
}
