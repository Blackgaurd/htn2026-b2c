/**
 * The cold-open. Pre-auth, so it deliberately shows no real data, the sample
 * tiles are decoration, not a leak of somebody's rankings.
 */

import { gradient, palette } from "../lib/display";
import { ScoreChip } from "./chrome";

const TEASERS = [
  { label: "E5 3F", score: 9.2 },
  { label: "E7 2F", score: 7.4 },
  { label: "E5 1F", score: 8.8 },
];

export function SplashScreen({ onRegister, onLogin }: { onRegister: () => void; onLogin: () => void }) {
  return (
    <div
      className="flex h-full flex-col items-center justify-between px-8 pb-16 pt-24"
      style={{ background: "linear-gradient(160deg, #F7F5F1 0%, #EEF0FB 60%, #E6F7F3 100%)" }}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div
            className="flex items-center justify-center"
            style={{
              width: 88,
              height: 88,
              borderRadius: 28,
              background: "linear-gradient(135deg, #7B8CDE 0%, #9B78D4 50%, #5EC4A8 100%)",
              boxShadow: "0 8px 32px #7B8CDE44",
            }}
          >
            <span style={{ fontSize: 40 }}>🚻</span>
          </div>
          <div className="absolute -right-2 -top-2" style={{ fontSize: 18 }}>
            ✨
          </div>
        </div>

        <div className="text-center">
          <h1 style={{ fontSize: 56, fontWeight: 800, color: palette.charcoal, lineHeight: 1, letterSpacing: "-2px" }}>
            p<span style={{ color: palette.periwinkle }}>ü</span>pi
          </h1>
          <p style={{ color: palette.muted, fontSize: 15, fontWeight: 500, maxWidth: 220, marginTop: 16 }}>
            Rate, rank, and discover the best bathrooms on campus.
          </p>
        </div>

        <div className="mt-2 flex gap-3">
          {TEASERS.map(teaser => (
            <div key={teaser.label} className="flex flex-col items-center gap-1">
              <div
                className="flex items-center justify-center"
                style={{ width: 72, height: 72, borderRadius: 20, background: "white", boxShadow: "0 2px 12px #0000000D" }}
              >
                <span style={{ fontSize: 28 }}>🚽</span>
              </div>
              <span style={{ fontSize: 11, color: palette.muted, fontWeight: 500 }}>{teaser.label}</span>
              <ScoreChip score={teaser.score} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        <button
          onClick={onRegister}
          className="w-full py-4 transition-opacity active:opacity-80"
          style={{
            background: gradient.primary,
            borderRadius: 16,
            color: "white",
            fontSize: 16,
            fontWeight: 700,
            boxShadow: "0 4px 20px #7B8CDE44",
          }}
        >
          Create Account
        </button>
        <button
          onClick={onLogin}
          className="w-full py-4 transition-opacity active:opacity-80"
          style={{
            background: "white",
            borderRadius: 16,
            color: palette.periwinkle,
            fontSize: 16,
            fontWeight: 700,
            border: "1.5px solid #C5CBEF",
          }}
        >
          Log In
        </button>
        <p className="mt-1 text-center" style={{ color: palette.faint, fontSize: 12 }}>
          University of Waterloo · E5 &amp; E7 Buildings
        </p>
      </div>
    </div>
  );
}
