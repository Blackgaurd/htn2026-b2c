/**
 * Demo chrome: renders children inside a phone-sized bezel so the app reads as
 * mobile on a laptop screen. Dimensions match the Figma frame (390×844).
 *
 * The status bar floats *over* the app surface rather than taking a row of its
 * own — that's why every screen starts with `pt-14`, and why a gradient header can
 * run all the way to the top of the device the way it does in the design. It's
 * `pointer-events-none`, so it never eats a tap meant for the screen underneath.
 *
 * Purely cosmetic — nothing inside depends on it. Drop it from App.tsx if you ever
 * want the app full-bleed.
 */

import type { ReactNode } from "react";

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex shrink-0 flex-col overflow-hidden"
      style={{
        width: 390,
        height: 844,
        borderRadius: 52,
        background: "#F7F5F1",
        boxShadow: "0 32px 80px #00000030, 0 0 0 1px #00000015, inset 0 0 0 1px #ffffff40",
      }}
    >
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-8 pb-1 pt-4"
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: "#1C1C2E" }}>9:41</span>
        {/* Dynamic island */}
        <div style={{ width: 120, height: 28, borderRadius: 16, background: "#1C1C2E", marginTop: -4 }} />
        <div className="flex items-center gap-1">
          <svg width="16" height="12" viewBox="0 0 16 12" fill="#1C1C2E">
            <rect x="0" y="5" width="3" height="7" rx="1" />
            <rect x="4.5" y="3" width="3" height="9" rx="1" />
            <rect x="9" y="1" width="3" height="11" rx="1" />
            <rect x="13.5" y="0" width="2.5" height="12" rx="1" opacity="0.3" />
          </svg>
        </div>
      </div>

      {/* App surface — the only part your screens own */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
