/**
 * Demo chrome: renders children inside a phone-sized bezel so the app reads as
 * mobile on a laptop screen. Dimensions match an iPhone 14 Pro (390×844).
 *
 * Purely cosmetic — nothing inside depends on it. Drop it from App.tsx if you
 * ever want the app full-bleed.
 */

import type { ReactNode } from "react";
import { BatteryFull, Signal, Wifi } from "lucide-react";

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-[844px] w-[390px] shrink-0 rounded-[3rem] bg-neutral-900 p-[14px] shadow-2xl ring-1 ring-black/20">
      {/* Dynamic island */}
      <div className="absolute left-1/2 top-[26px] z-20 h-[26px] w-[104px] -translate-x-1/2 rounded-full bg-black" />

      <div className="flex h-full w-full flex-col overflow-hidden rounded-[2.25rem] bg-background text-foreground">
        {/* Status bar */}
        <div className="flex h-12 flex-none items-end justify-between px-7 pb-1 text-xs font-semibold">
          <span>9:41</span>
          <span className="flex items-center gap-1.5">
            <Signal className="size-3.5" />
            <Wifi className="size-3.5" />
            <BatteryFull className="size-4" />
          </span>
        </div>

        {/* App surface — the only part your screens own */}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {/* Home indicator */}
        <div className="grid h-6 flex-none place-items-center">
          <div className="h-[5px] w-[134px] rounded-full bg-foreground/25" />
        </div>
      </div>
    </div>
  );
}
