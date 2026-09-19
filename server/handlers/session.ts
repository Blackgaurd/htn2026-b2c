/**
 * Session: register, login, me, and the one profile edit.
 *
 * The whole auth story, on purpose (CLAUDE.md): no tokens, no sessions table, no
 * hashing. The signed-in user arrives as the `x-pupi-user` header and `requireUser()`
 * in `server/lib.ts` resolves it.
 *
 * Mirrors `src/mocks/client.ts:196-252`, with one deliberate difference: the server
 * really does compare the password, while the mock ignores it. Keep the mock's exact
 * wording for the cases it already has: the UI prints these strings verbatim.
 */

import { eq } from "drizzle-orm";
import type {
  LoginBody,
  RegisterBody,
  UpdateProfileBody,
  User,
  WashroomPref,
} from "../../shared/api";
import { hasWhitespace, isValidEmail, usernameForStorage } from "../../shared/auth";
import { db } from "../db";
import { HttpError, now, publicUser, readBody, requireUser, type UserRow } from "../lib";
import { users } from "../schema";

/** Assigned at register, in order, so a fresh demo gets varied avatar chips. */
const PALETTE = ["#7B8CDE", "#9B78D4", "#5B8FE8", "#E87DB8", "#5EC4A8", "#F5A623"] as const;

/** The three the contract allows, a body is untrusted, so check before storing. */
const PREFS: readonly WashroomPref[] = ["female", "male", "universal"] as const;

export async function register(req: Request): Promise<User> {
  const body = await readBody<RegisterBody>(req);

  const rawUsername = body.username ?? "";
  const username = usernameForStorage(rawUsername);
  const email = (body.email ?? "").trim().toLowerCase();
  if (!username) throw new HttpError(400, "username is required");
  if (!email) throw new HttpError(400, "email is required");
  if (hasWhitespace(rawUsername)) throw new HttpError(400, "username cannot contain spaces");
  if (!isValidEmail(email)) throw new HttpError(400, "enter a valid email address");
  if (!PREFS.includes(body.washroom_pref)) {
    throw new HttpError(400, "pick a washroom preference");
  }

  // Read the table once: it answers both uniqueness questions and supplies the
  // palette index, and at demo scale that's cheaper than three round trips.
  const existing = db.select().from(users).all();
  if (existing.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    throw new HttpError(400, `@${username} is taken`);
  }
  if (existing.some(u => u.email.toLowerCase() === email)) {
    throw new HttpError(400, "that email already has an account");
  }

  const created = db
    .insert(users)
    .values({
      username,
      display_name: (body.display_name ?? "").trim() || username,
      email,
      // Plaintext on purpose: see the auth note in CLAUDE.md and `schema.ts`.
      password: body.password,
      washroom_pref: body.washroom_pref,
      avatar_color: PALETTE[existing.length % PALETTE.length] ?? PALETTE[0],
      created_at: now(),
    })
    .returning()
    .get();

  return publicUser(created);
}

export async function login(req: Request): Promise<User> {
  const body = await readBody<LoginBody>(req);
  const email = (body.email ?? "").trim().toLowerCase();

  // Emails are stored lowercased (see `schema.ts`), so a plain match is enough.
  const row = db.select().from(users).where(eq(users.email, email)).get();
  if (!row) throw new HttpError(401, "no account for that email");

  // The one place the server deliberately differs from the mock, which ignores
  // the password entirely. Don't "fix" this to match it.
  if (row.password !== body.password) throw new HttpError(401, "wrong password");

  return publicUser(row);
}

export function me(req: Request): User {
  const user: UserRow = requireUser(req);
  return publicUser(user);
}

/**
 * The only thing a user can change about themselves: their bio.
 *
 * A blank becomes null rather than `""`, exactly as the mock does. The profile
 * screen branches on null to decide between the bio and its placeholder, so
 * storing whitespace would leave it printing an empty line forever.
 */
export async function updateProfile(req: Request): Promise<User> {
  const user = requireUser(req);
  const body = await readBody<UpdateProfileBody>(req);

  const bio = body.bio?.trim();
  const updated = db
    .update(users)
    .set({ bio: bio ? bio : null })
    .where(eq(users.id, user.id))
    .returning()
    .get();

  return publicUser(updated);
}
