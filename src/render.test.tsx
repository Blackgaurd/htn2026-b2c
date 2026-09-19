/**
 * Render smoke test: every screen, with real fixture data, must produce markup
 * without throwing.
 *
 * Effects don't run under `renderToString`, so the fetching screens only get as
 * far as their loading state — that still catches an import cycle or a crash at
 * module scope. The prop-driven ones (the result reveal, the rate form) render in
 * full, which is where the risky indexing lives: medal lookups by rank, the
 * window slice around the new entry, `STAR_LABELS[value]`.
 *
 * Run with `bun test`.
 */
import { expect, test } from "bun:test";
import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { mockClient } from "./mocks/client";

import { SplashScreen } from "./components/SplashScreen";
import { LoginScreen } from "./components/LoginScreen";
import { RegisterScreen } from "./components/RegisterScreen";
import { HomeScreen } from "./components/HomeScreen";
import { DetailScreen } from "./components/DetailScreen";
import { RateSelectScreen } from "./components/RateSelectScreen";
import { RateScoreScreen } from "./components/RateScoreScreen";
import { CompareScreen } from "./components/CompareScreen";
import { CompareResultScreen } from "./components/CompareResultScreen";
import { RankingsScreen } from "./components/RankingsScreen";
import { FriendsScreen } from "./components/FriendsScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { App } from "./App";

const noop = () => {};
const text = (element: ReactElement) => renderToString(element).replaceAll("<!-- -->", "");

const user = await mockClient.login({ email: "a24chen@uwaterloo.ca", password: "pupi" });
const bathrooms = await mockClient.listBathrooms();
const bathroom = bathrooms[0]!;
const ratings = { cleanliness: 5, accessibility: 4, hygiene: 5, privacy: 4, smell: 5 };
const fresh = bathrooms.find(b => b.id === 11)!;
const result = await mockClient.submitReview({
  bathroom_id: fresh.id, ratings, note: "A note.", bucket: "loved", position: 1,
});
const draft = { bathroom, ratings, note: null, bucket: "loved" as const };

const screens: [string, () => ReactElement][] = [
  ["Splash", () => <SplashScreen onRegister={noop} onLogin={noop} />],
  ["Login", () => <LoginScreen onDone={noop} onRegister={noop} />],
  ["Register", () => <RegisterScreen onDone={noop} onLogin={noop} />],
  ["Home", () => <HomeScreen user={user} onOpen={noop} />],
  ["Detail", () => <DetailScreen bathroomId={bathroom.id} onBack={noop} onRate={noop} onOpenProfile={noop} />],
  ["RateSelect", () => <RateSelectScreen onBack={noop} onPick={noop} />],
  ["RateScore", () => <RateScoreScreen bathroom={bathroom} onBack={noop} onContinue={noop} />],
  ["Compare", () => <CompareScreen draft={draft} onBack={noop} onDone={noop} />],
  ["CompareResult", () => <CompareResultScreen result={result} onDone={noop} onSeeRankings={noop} />],
  ["Rankings", () => <RankingsScreen onOpen={noop} onRate={noop} />],
  ["Friends", () => <FriendsScreen onOpenBathroom={noop} onOpenProfile={noop} />],
  ["Profile (me)", () => <ProfileScreen onOpenBathroom={noop} onSignedOut={noop} />],
  ["Profile (other)", () => <ProfileScreen userId={3} onBack={noop} onOpenBathroom={noop} onSignedOut={noop} />],
  ["App", () => <App />],
];

for (const [name, render] of screens) {
  test(`renders: ${name}`, () => {
    const html = renderToString(render());
    expect(html.length).toBeGreaterThan(50);
  });
}

test("the result screen actually paints the score and the podium", () => {
  // React separates adjacent text nodes with `<!-- -->` in SSR output; strip them
  // so assertions read as the user sees the text, not as React emits it.
  const html = text(<CompareResultScreen result={result} onDone={noop} onSeeRankings={noop} />);
  expect(html).toContain(result.review.score.toFixed(1));
  expect(html).toContain("YOUR SCORE");
  expect(html).toContain("NEW");
  expect(html).toContain(`#${result.rank} of ${result.rankings.length}`);
});

test("the rate screen paints all five categories and the three buckets", () => {
  const html = text(<RateScoreScreen bathroom={bathroom} onBack={noop} onContinue={noop} />);
  for (const label of ["Cleanliness", "Accessibility", "Hygiene Products", "Privacy", "Smell"]) {
    expect(html).toContain(label);
  }
  for (const label of ["Loved it", "It was fine", "Never again"]) expect(html).toContain(label);
  expect(html).toContain("Rate all 5 categories to continue");
});
