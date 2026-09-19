/**
 * The cold-open. It uses the same restrained surfaces as the signed-in app so
 * signing in feels like entering the product, not changing sites.
 */

import { gradient, palette } from "../lib/display";

export function SplashScreen({ onRegister, onLogin }: { onRegister: () => void; onLogin: () => void }) {
  return (
    <div className="flex h-full flex-col px-6 pb-12 pt-16" style={{ background: palette.bg }}>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 style={{ fontSize: 52, fontWeight: 800, color: palette.charcoal, lineHeight: 1, letterSpacing: "-2px" }}>
          p<span style={{ color: palette.periwinkle }}>ü</span>pi
        </h1>
        <h2 style={{ fontSize: 27, fontWeight: 800, color: palette.charcoal, lineHeight: 1.2, marginTop: 30 }}>
          Find a better bathroom.
        </h2>
        <p style={{ color: palette.muted, fontSize: 15, lineHeight: 1.5, maxWidth: 250, marginTop: 10 }}>
          Rate, rank, and discover campus bathrooms with your community.
        </p>
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
          University of Waterloo
        </p>
      </div>
    </div>
  );
}
