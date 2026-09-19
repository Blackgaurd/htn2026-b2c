/**
 * App shell, auth gate, screen state, and the tab bar.
 *
 * A tagged union instead of a router, because every screen either belongs to a tab
 * or is a step in the review flow, and the flow's steps carry data (the draft, the
 * result) that a URL would have to invent a way to hold. `useState` is enough; see
 * CLAUDE.md before reaching for a router.
 *
 * Navigating unmounts the old screen, so each one reloads from `../api` when it
 * mounts, that's how the rankings catch up after a review without any cache to
 * invalidate.
 */

import { useCallback, useEffect, useState } from "react";
import "./index.css";
import type { Bathroom, SubmitReviewResult, User } from "../shared/api";
import { currentUser } from "./api";
import type { ReviewDraft } from "./lib/duel";
import { LoadingScreen, TabBar, type Tab } from "./components/chrome";
import { PhoneFrame } from "./components/PhoneFrame";
import { SplashScreen } from "./components/SplashScreen";
import { LoginScreen } from "./components/LoginScreen";
import { RegisterScreen } from "./components/RegisterScreen";
import { HomeScreen } from "./components/HomeScreen";
import { DetailScreen } from "./components/DetailScreen";
import { SearchScreen } from "./components/SearchScreen";
import { NearMeScreen } from "./components/NearMeScreen";
import { RateScoreScreen } from "./components/RateScoreScreen";
import { CompareScreen } from "./components/CompareScreen";
import { CompareResultScreen } from "./components/CompareResultScreen";
import { RankingsScreen } from "./components/RankingsScreen";
import { PeopleScreen } from "./components/PeopleScreen";
import { ProfileScreen } from "./components/ProfileScreen";

type Screen =
  | { name: "splash" }
  | { name: "login" }
  | { name: "register" }
  | { name: "home" }
  | { name: "nearby" }
  | { name: "rankings" }
  /** One screen, two jobs: `pick` decides whether it opens or rates what you choose. */
  | { name: "search"; mode: "open" | "rate"; origin: Screen }
  /** `userId` undefined is your own profile, the only one with a tab bar. */
  | { name: "profile"; userId?: number }
  | { name: "people"; origin: Screen }
  | { name: "detail"; bathroomId: number; origin: Tab }
  | { name: "rate-score"; bathroom: Bathroom }
  | { name: "compare"; draft: ReviewDraft }
  | { name: "result"; result: SubmitReviewResult };

/**
 * The screen a tab points at, the inverse of `tabFor`.
 *
 * A switch rather than `{ name: tab }` because the union is discriminated on a
 * literal, and a variable typed as the union of all four doesn't narrow to any one
 * member. This is also the one place a tab name turns into a screen, so back-out-of
 * -detail and tap-the-tab can't drift.
 */
function screenForTab(tab: Tab): Screen {
  switch (tab) {
    case "home":
      return { name: "home" };
    case "nearby":
      return { name: "nearby" };
    case "rankings":
      return { name: "rankings" };
    case "profile":
      return { name: "profile" };
  }
}

/** Which screens keep the tab bar. The review flow deliberately doesn't. */
function tabFor(screen: Screen): Tab | null {
  switch (screen.name) {
    case "home":
      return "home";
    case "nearby":
      return "nearby";
    case "rankings":
      return "rankings";
    case "profile":
      return screen.userId === undefined ? "profile" : null;
    case "detail":
      return screen.origin;
    default:
      return null;
  }
}

export function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [screen, setScreen] = useState<Screen>({ name: "splash" });

  // One auth check on boot. With mocks on you land signed in; with `?mock=0` and
  // no stored id, you land on the splash.
  useEffect(() => {
    currentUser().then(
      found => {
        setUser(found);
        setScreen(found ? { name: "home" } : { name: "splash" });
      },
      () => {
        setUser(null);
        setScreen({ name: "splash" });
      },
    );
  }, []);

  const signedIn = useCallback(async () => {
    const found = await currentUser();
    setUser(found);
    setScreen(found ? { name: "home" } : { name: "splash" });
  }, []);

  const openBathroom = useCallback(
    (bathroom: Bathroom | number, origin: Tab = "home") =>
      setScreen({
        name: "detail",
        bathroomId: typeof bathroom === "number" ? bathroom : bathroom.id,
        origin,
      }),
    [],
  );

  const tab = tabFor(screen);

  return (
    <main className="flex min-h-screen w-full items-center justify-center p-6" style={{ background: "#E8E5DE" }}>
      <div className="phone-stage">
        <PhoneFrame>
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-hidden">
              {user === undefined ? <LoadingScreen /> : renderScreen()}
            </div>

            {tab && user && (
              <TabBar
                active={tab}
                onSelect={next => setScreen(screenForTab(next))}
                onRate={() => setScreen({ name: "search", mode: "rate", origin: { name: "home" } })}
              />
            )}
          </div>
        </PhoneFrame>
      </div>
    </main>
  );

  function renderScreen() {
    switch (screen.name) {
      case "splash":
        return (
          <SplashScreen
            onRegister={() => setScreen({ name: "register" })}
            onLogin={() => setScreen({ name: "login" })}
          />
        );

      case "login":
        return <LoginScreen onDone={signedIn} onRegister={() => setScreen({ name: "register" })} />;

      case "register":
        return <RegisterScreen onDone={signedIn} onLogin={() => setScreen({ name: "login" })} />;

      case "home": {
        const here: Screen = { name: "home" };
        return (
          <HomeScreen
            onRate={bathroom => setScreen({ name: "rate-score", bathroom })}
            onOpenProfile={userId => setScreen({ name: "profile", userId })}
            onOpenSearch={() => setScreen({ name: "search", mode: "open", origin: here })}
            onFindPeople={() => setScreen({ name: "people", origin: here })}
          />
        );
      }

      case "nearby":
        return <NearMeScreen onOpen={b => openBathroom(b, "nearby")} />;

      case "search": {
        const { mode, origin } = screen;
        return (
          <SearchScreen
            title={mode === "rate" ? "Which washroom?" : "Search"}
            picking={mode === "rate"}
            onBack={() => setScreen(origin)}
            onPick={bathroom =>
              mode === "rate"
                ? setScreen({ name: "rate-score", bathroom })
                : setScreen({ name: "detail", bathroomId: bathroom.id, origin: tabFor(origin) ?? "home" })
            }
          />
        );
      }

      case "detail": {
        const origin = screen.origin;
        return (
          <DetailScreen
            bathroomId={screen.bathroomId}
            onBack={() => setScreen(screenForTab(origin))}
            // Step 1 is choosing a bathroom, and it's already chosen, skip it.
            onRate={bathroom => setScreen({ name: "rate-score", bathroom })}
          />
        );
      }

      case "rate-score":
        return (
          <RateScoreScreen
            bathroom={screen.bathroom}
            onBack={() => setScreen({ name: "search", mode: "rate", origin: { name: "home" } })}
            onContinue={draft => setScreen({ name: "compare", draft })}
          />
        );

      case "compare":
        return (
          <CompareScreen
            draft={screen.draft}
            onBack={() => setScreen({ name: "rate-score", bathroom: screen.draft.bathroom })}
            onDone={result => setScreen({ name: "result", result })}
          />
        );

      case "result":
        return (
          // Done lands you back on the feed: the review flow started from a tab
          // and ends by handing the app back, not by opening a fourth screen.
          <CompareResultScreen result={screen.result} onDone={() => setScreen({ name: "home" })} />
        );

      case "rankings":
        return (
          <RankingsScreen onOpen={b => openBathroom(b, "rankings")} />
        );

      case "people": {
        const origin = screen.origin;
        return (
          <PeopleScreen
            onBack={() => setScreen(origin)}
            onOpenProfile={userId => setScreen({ name: "profile", userId })}
          />
        );
      }

      case "profile": {
        const here: Screen = { name: "profile", userId: screen.userId };
        return (
          <ProfileScreen
            userId={screen.userId}
            onBack={screen.userId === undefined ? undefined : () => setScreen({ name: "home" })}
            onOpenBathroom={b => openBathroom(b, "profile")}
            onFindPeople={() => setScreen({ name: "people", origin: here })}
            onSignedOut={() => {
              setUser(null);
              setScreen({ name: "splash" });
            }}
          />
        );
      }
    }
  }
}

export default App;
