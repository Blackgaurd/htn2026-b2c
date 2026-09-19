/**
 * Small, dependency-free auth input checks shared by the browser, mock and server.
 * They intentionally establish a practical format floor rather than attempting to
 * implement the full email RFC.
 */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function hasWhitespace(value: string): boolean {
  return /\s/.test(value);
}

/** The optional @ is presentation only; usernames are stored without it. */
export function usernameForStorage(value: string): string {
  return value.trim().replace(/^@/, "");
}
