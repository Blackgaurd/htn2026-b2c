import type { KeyboardEventHandler } from "react";
import { palette } from "../lib/display";

type AuthFieldProps = {
  id: string;
  label: string;
  type: "email" | "password" | "text";
  placeholder: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
};

/** Consistent field treatment for the two pre-auth forms. */
export function AuthField({
  id,
  label,
  type,
  placeholder,
  value,
  error,
  onChange,
  onBlur,
  onKeyDown,
}: AuthFieldProps) {
  const messageId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600, color: palette.muted, display: "block", marginBottom: 6 }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? messageId : undefined}
        className="w-full px-4 py-3.5 outline-none"
        style={{
          borderRadius: 14,
          background: "white",
          border: `1.5px solid ${error ? "#D2544F" : palette.border}`,
          fontSize: 15,
          color: palette.charcoal,
          fontFamily: "inherit",
          boxShadow: error ? "0 0 0 3px #D2544F14" : "none",
        }}
        onFocus={e => {
          if (error) return;
          e.target.style.borderColor = palette.periwinkle;
          e.target.style.boxShadow = "0 0 0 3px #7B8CDE18";
        }}
      />
      {error && (
        <p id={messageId} role="alert" style={{ color: "#D2544F", fontSize: 12, fontWeight: 600, marginTop: 6 }}>
          {error}
        </p>
      )}
    </div>
  );
}
