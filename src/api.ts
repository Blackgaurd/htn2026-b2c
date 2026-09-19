/**
 * The only frontend file that knows HTTP exists, and the switch between the real
 * backend and the fixtures.
 *
 * Components import these functions and get typed domain objects back. They cannot
 * see URLs, fetch, status codes, SQL, or whether the data came from `data.db` or
 * `src/mocks/`, so the backend can reshape any of that, or not exist yet, without
 * touching a component.
 *
 * Both clients implement `ApiClient` from the contract, so they cannot drift apart.
 * Which one is live comes from the URL, see `src/mocks/enabled.ts`.
 *
 * There's no token: the signed-in user is an id in `localStorage` (see
 * `src/session.ts`) sent as `x-pupi-user`. That's the whole auth story, on purpose.
 */

import type {
  ApiClient,
  ApiError,
  Bathroom,
  BathroomDetail,
  FeedEntry,
  LoginBody,
  Profile,
  RankedBathroom,
  RegisterBody,
  SubmitReviewBody,
  SubmitReviewResult,
  UpdateProfileBody,
  User,
  UserSummary,
} from "../shared/api";
import { paths } from "../shared/api";
import { mockClient } from "./mocks/client";
import { USE_MOCKS } from "./mocks/enabled";
import { readUserId, writeUserId } from "./session";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const userId = readUserId();
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(userId === null ? {} : { "x-pupi-user": String(userId) }),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new Error(body?.error ?? `${init?.method ?? "GET"} ${url} → ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const send = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

const httpClient: ApiClient = {
  async register(body) {
    const user = await request<User>(paths.register, send("POST", body satisfies RegisterBody));
    writeUserId(user.id);
    return user;
  },

  async login(body) {
    const user = await request<User>(paths.login, send("POST", body satisfies LoginBody));
    writeUserId(user.id);
    return user;
  },

  async currentUser() {
    if (readUserId() === null) return null;
    try {
      return await request<User>(paths.me);
    } catch {
      // A stale id from a reseeded database should sign you out, not wedge the app.
      writeUserId(null);
      return null;
    }
  },

  updateProfile: body =>
    request<User>(paths.profileEdit, send("PATCH", body satisfies UpdateProfileBody)),

  async logout() {
    writeUserId(null);
  },

  listBathrooms: () => request<Bathroom[]>(paths.bathrooms),
  getBathroom: id => request<BathroomDetail>(paths.bathroom(id)),

  listMyRankings: () => request<RankedBathroom[]>(paths.rankings),
  submitReview: body =>
    request<SubmitReviewResult>(paths.reviews, send("POST", body satisfies SubmitReviewBody)),

  listBookmarks: () => request<Bathroom[]>(paths.bookmarks),
  setBookmark: (bathroomId, on) =>
    request<{ bathroom_id: number; bookmarked: boolean }>(paths.bookmark(bathroomId), {
      method: on ? "PUT" : "DELETE",
    }),

  listWantToGo: () => request<Bathroom[]>(paths.wantToGo),
  setWantToGo: (bathroomId, on) =>
    request<{ bathroom_id: number; want_to_go: boolean }>(paths.wantToGoItem(bathroomId), {
      method: on ? "PUT" : "DELETE",
    }),

  listFeed: () => request<FeedEntry[]>(paths.feed),
  searchUsers: query => request<UserSummary[]>(paths.users(query)),
  setFollow: (userId, on) =>
    request<UserSummary>(paths.follow(userId), { method: on ? "PUT" : "DELETE" }),
  getProfile: userId => request<Profile>(paths.profile(userId)),
};

const client: ApiClient = USE_MOCKS ? mockClient : httpClient;

export const {
  register,
  login,
  currentUser,
  updateProfile,
  logout,
  listBathrooms,
  getBathroom,
  listMyRankings,
  submitReview,
  listBookmarks,
  setBookmark,
  listWantToGo,
  setWantToGo,
  listFeed,
  searchUsers,
  setFollow,
  getProfile,
} = client;
