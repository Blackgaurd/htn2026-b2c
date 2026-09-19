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

  const fields = [
    { label: "Email", placeholder: "a24chen@uwaterloo.ca", type: "email", value: email, set: setEmail },
    { label: "Password", placeholder: "••••••••", type: "password", value: password, set: setPassword },
  ];

  return (
    <div className="flex h-full flex-col" style={{ background: palette.bg }}>
      <div className="flex flex-1 flex-col justify-center px-6">
        <div className="mb-10 flex items-center gap-3">
          <div
            className="flex items-center justify-center"
            style={{ width: 52, height: 52, borderRadius: 16, background: gradient.brand }}
          >
            <span style={{ fontSize: 24 }}>🚻</span>
          </div>
          <span style={{ fontSize: 32, fontWeight: 800, color: palette.charcoal, letterSpacing: "-1px" }}>
            p<span style={{ color: palette.periwinkle }}>ü</span>pi
          </span>
        </div>

        <h2 style={{ fontSize: 26, fontWeight: 800, color: palette.charcoal, marginBottom: 4 }}>Welcome back</h2>
        <p style={{ color: palette.muted, fontSize: 14, marginBottom: 32 }}>Sign in to your account</p>

        <div className="flex flex-col gap-4">
          {fields.map(field => (
            <div key={field.label}>
              <label style={{ fontSize: 13, fontWeight: 600, color: palette.muted, display: "block", marginBottom: 6 }}>
                {field.label}
              </label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={field.value}
                onChange={e => field.set(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                className="w-full px-4 py-3.5 outline-none"
                style={{
                  borderRadius: 14,
                  background: "white",
                  border: `1.5px solid ${palette.border}`,
                  fontSize: 15,
                  color: palette.charcoal,
                  fontFamily: "inherit",
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
          ))}

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
          <button onClick={onRegister} style={{ color: palette.periwinkle, fontWeight: 700 }}>
            Create account
          </button>
        </p>
      </div>
    </div>
  );
}
