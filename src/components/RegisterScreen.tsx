/**
 * Two-step register. Step 2 is the important one: `washroom_pref` decides what the
 * whole app will show this person, so it's a screen of its own with the
 * consequence spelled out under each option rather than a dropdown on a form.
 *
 * There is no "accessible" option. Accessibility is a rating and a room property,
 * not a washroom you're sorted into.
 */

import { useState } from "react";
import type { WashroomType } from "../../shared/api";
import { hasWhitespace, isValidEmail, usernameForStorage } from "../../shared/auth";
import { register } from "../api";
import { gradient, palette, prefBlurb, washroomMeta } from "../lib/display";
import { AuthField } from "./AuthField";
import { Notice } from "./chrome";
import { BackIcon, CheckIcon } from "./icons";

const PREF_OPTIONS: WashroomType[] = ["male", "female", "universal"];

const FIELDS = [
  { key: "display_name", label: "Full Name", placeholder: "Waterloo Student", type: "text" },
  { key: "email", label: "Email", placeholder: "ws23abc@uwaterloo.ca", type: "email" },
  { key: "username", label: "Username", placeholder: "@flushmaster99", type: "text" },
  { key: "password", label: "Password", placeholder: "••••••••", type: "password" },
] as const;

type RegistrationForm = Record<(typeof FIELDS)[number]["key"], string>;
type FieldName = keyof RegistrationForm;
type FieldErrors = Partial<Record<FieldName, string>>;

function validationErrors(form: RegistrationForm): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.display_name.trim()) errors.display_name = "Enter your name.";
  if (!form.email.trim()) errors.email = "Enter your email address.";
  else if (!isValidEmail(form.email)) errors.email = "Enter a valid email address.";
  if (!usernameForStorage(form.username)) errors.username = "Choose a username.";
  else if (hasWhitespace(form.username)) errors.username = "Usernames can't contain spaces.";
  if (!form.password) errors.password = "Enter a password.";
  return errors;
}

export function RegisterScreen({ onDone, onLogin }: { onDone: () => void; onLogin: () => void }) {
  const [step, setStep] = useState<"info" | "preference">("info");
  const [form, setForm] = useState<RegistrationForm>({ display_name: "", email: "", username: "", password: "" });
  const [pref, setPref] = useState<WashroomType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [attemptedInfo, setAttemptedInfo] = useState(false);

  const errors = validationErrors(form);
  const canContinue = Object.keys(errors).length === 0;

  function continueToPreference() {
    if (!canContinue) {
      setAttemptedInfo(true);
      return;
    }
    setError(null);
    setStep("preference");
  }

  async function submit() {
    if (!pref || busy) return;
    setBusy(true);
    setError(null);
    try {
      await register({ ...form, washroom_pref: pref });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("info");
    } finally {
      setBusy(false);
    }
  }

  if (step === "preference") {
    return (
      <div className="flex h-full flex-col" style={{ background: palette.bg }}>
        <div className="px-6 pb-6 pt-16">
          <button
            onClick={() => setStep("info")}
            className="-ml-1 mb-6 flex items-center gap-1"
            style={{ color: palette.periwinkleDeep, fontWeight: 600, fontSize: 14 }}
          >
            <BackIcon />
            Back
          </button>
          <span style={{ color: palette.faint, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>STEP 2 OF 2</span>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: palette.charcoal, lineHeight: 1.2, marginTop: 8 }}>
            Which washrooms
            <br />
            do you use?
          </h2>
          <p style={{ color: palette.muted, fontSize: 14, lineHeight: 1.5, marginTop: 8 }}>
            This decides which bathrooms you can browse, rate and save. Your friends' posts still show everything.
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-3 px-6">
          {PREF_OPTIONS.map(option => {
            const meta = washroomMeta[option];
            const selected = pref === option;
            return (
              <button
                key={option}
                onClick={() => setPref(option)}
                className="flex w-full items-center gap-4 p-4 transition-all"
                style={{
                  borderRadius: 20,
                  background: selected ? meta.bg : "white",
                  border: selected ? `2px solid ${meta.color}` : "2px solid transparent",
                  boxShadow: selected ? `0 4px 20px ${meta.color}22` : "0 2px 8px #0000000A",
                }}
              >
                <div className="flex-1 text-left">
                  <div style={{ fontSize: 16, fontWeight: 700, color: palette.charcoal }}>{meta.label}</div>
                  <div style={{ fontSize: 12, color: palette.muted, marginTop: 2 }}>{prefBlurb[option]}</div>
                </div>
                <div
                  className="flex flex-shrink-0 items-center justify-center"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: `2px solid ${selected ? meta.color : palette.border}`,
                    background: selected ? meta.color : "transparent",
                  }}
                >
                  {selected && <CheckIcon />}
                </div>
              </button>
            );
          })}
          {error && <Notice tone="error">{error}</Notice>}
        </div>

        <div className="px-6 pb-10 pt-6">
          <button
            onClick={submit}
            disabled={!pref || busy}
            className="w-full py-4"
            style={{
              borderRadius: 16,
              fontSize: 16,
              fontWeight: 700,
              background: pref ? gradient.primary : palette.border,
              color: pref ? "white" : palette.faint,
              boxShadow: pref ? "0 4px 20px #7B8CDE44" : "none",
            }}
          >
            {busy ? "Creating…" : "Create account"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="phone-scroll flex h-full flex-col overflow-auto" style={{ background: palette.bg }}>
      <div className="px-6 pb-4 pt-16">
        <h1 style={{ fontSize: 28, fontWeight: 800, color: palette.charcoal, lineHeight: 1.2 }}>
          Join <span style={{ color: palette.periwinkle }}>püpi</span>
        </h1>
        <p style={{ color: palette.muted, fontSize: 14, marginTop: 6 }}>Rate the best loos at UW.</p>
      </div>

      <div className="flex flex-col gap-4 px-6 pb-8">
        {FIELDS.map(field => {
          const fieldError = attemptedInfo || touched[field.key] ? errors[field.key] : undefined;
          return (
            <AuthField
              key={field.key}
              id={`register-${field.key}`}
              label={field.label}
              type={field.type}
              placeholder={field.placeholder}
              value={form[field.key]}
              error={fieldError}
              onChange={value => setForm(f => ({ ...f, [field.key]: value }))}
              onBlur={() => setTouched(current => ({ ...current, [field.key]: true }))}
              onKeyDown={e => e.key === "Enter" && continueToPreference()}
            />
          );
        })}

        {error && <Notice tone="error">{error}</Notice>}

        <button
          onClick={continueToPreference}
          disabled={!canContinue}
          className="mt-2 w-full py-4 transition-opacity active:opacity-80"
          style={{
            borderRadius: 16,
            fontSize: 16,
            fontWeight: 700,
            color: canContinue ? "white" : palette.faint,
            background: canContinue ? gradient.primary : palette.border,
            boxShadow: canContinue ? "0 4px 20px #7B8CDE44" : "none",
          }}
        >
          Continue
        </button>
        <p className="text-center" style={{ color: palette.muted, fontSize: 13 }}>
          Already have an account?{" "}
          <button onClick={onLogin} style={{ color: palette.periwinkleDeep, fontWeight: 600 }}>
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
