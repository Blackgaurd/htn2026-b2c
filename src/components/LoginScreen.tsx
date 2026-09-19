/**
 * Log in. Email only decides who you are, no password is checked, by design
 * (see the auth note in CLAUDE.md). The field is here because the design has it
 * and because turning it real later shouldn't move any pixels.
 *
 * The placeholder is a live demo account, so there's always a way back in.
 */

import { useState } from "react";
import { login } from "../api";
import { gradient, palette } from "../lib/display";
import { Notice } from "./chrome";
import { AuthField } from "./AuthField";

export function LoginScreen({ onDone, onRegister }: { onDone: () => void; onRegister: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await login({ email, password });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="phone-scroll flex h-full flex-col overflow-auto" style={{ background: palette.bg }}>
      <div className="flex flex-1 flex-col px-6 pb-8 pt-16">
        <div className="mb-10">
          <div style={{ fontSize: 32, fontWeight: 800, color: palette.charcoal, letterSpacing: "-1px" }}>
            p<span style={{ color: palette.periwinkle }}>ü</span>pi
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: palette.charcoal, lineHeight: 1.2, marginTop: 30 }}>Welcome back</h1>
          <p style={{ color: palette.muted, fontSize: 14, marginTop: 6 }}>Sign in to your account.</p>
        </div>

        <div className="flex flex-col gap-4">
          <AuthField
            id="login-email"
            label="Email"
            type="email"
            placeholder="a24chen@uwaterloo.ca"
            value={email}
            onChange={setEmail}
            onKeyDown={e => e.key === "Enter" && submit()}
          />
          <AuthField
            id="login-password"
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={setPassword}
            onKeyDown={e => e.key === "Enter" && submit()}
          />

          {error && <Notice tone="error">{error}</Notice>}

          <button
            onClick={submit}
            disabled={busy}
            className="mt-2 w-full py-4 transition-opacity active:opacity-80"
            style={{
              borderRadius: 16,
              fontSize: 16,
              fontWeight: 700,
              color: "white",
              background: gradient.primary,
              boxShadow: "0 4px 20px #7B8CDE44",
            }}
          >
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </div>
      </div>

      <div className="px-6 pb-12 text-center">
        <p style={{ color: palette.muted, fontSize: 14 }}>
          New to püpi?{" "}
          <button onClick={onRegister} style={{ color: palette.periwinkleDeep, fontWeight: 700 }}>
            Create account
          </button>
        </p>
      </div>
    </div>
  );
}
