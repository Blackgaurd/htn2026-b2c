/**
 * Render smoke test: every screen, with real fixture data, must produce markup
 * without throwing.
 *
 * Effects don't run under `renderToString`, so the fetching screens only get as
 * far as their loading state, that still catches an import cycle or a crash at
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
import { SearchScreen } from "./components/SearchScreen";
import { NearMeScreen } from "./components/NearMeScreen";
import { RateScoreScreen } from "./components/RateScoreScreen";
import { CompareScreen } from "./components/CompareScreen";
import { CompareResultScreen } from "./components/CompareResultScreen";
import { RankingsScreen } from "./components/RankingsScreen";
import { PeopleScreen } from "./components/PeopleScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { App } from "./App";

const noop = () => {};
/**
 * Rendered markup, read the way a user reads the page: React's `<!-- -->` text
 * separators removed and entities decoded, so an assertion can say "don't"
 * instead of "don&#x27;t".
 */
const text = (element: ReactElement) =>
  renderToString(element)
    .replaceAll("<!-- -->", "")
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

const user = await mockClient.login({ email: "a24chen@uwaterloo.ca", password: "pupi" });
const bathrooms = await mockClient.listBathrooms();
const bathroom = bathrooms[0]!;
const fresh = bathrooms.find(b => b.id === 11)!;
const result = await mockClient.submitReview({
  bathroom_id: fresh.id, rating: 5, details: {}, photos: [], note: "A note.", position: 1,
});
const draft = {
  bathroom,
  rating: 5 as const,
  details: {},
  photos: [],
  note: null,
  bucket: "loved" as const,
};

const screens: [string, () => ReactElement][] = [
  ["Splash", () => <SplashScreen onRegister={noop} onLogin={noop} />],
  ["Login", () => <LoginScreen onDone={noop} onRegister={noop} />],
  ["Register", () => <RegisterScreen onDone={noop} onLogin={noop} />],
  ["Home", () => <HomeScreen onOpenBathroom={noop} onOpenProfile={noop} onOpenSearch={noop} onFindPeople={noop} />],
  ["Detail", () => <DetailScreen bathroomId={bathroom.id} onBack={noop} onRate={noop} />],
  ["Search", () => <SearchScreen title="Search" onBack={noop} onPick={noop} />],
  ["NearMe", () => <NearMeScreen onOpen={noop} />],
  ["RateScore", () => <RateScoreScreen bathroom={bathroom} onBack={noop} onContinue={noop} />],
  ["Compare", () => <CompareScreen draft={draft} onBack={noop} onDone={noop} />],
  ["CompareResult", () => <CompareResultScreen result={result} onDone={noop} />],
  ["Rankings", () => <RankingsScreen onOpen={noop} />],
  ["People", () => <PeopleScreen onBack={noop} onOpenProfile={noop} />],
  ["Profile (me)", () => <ProfileScreen onOpenBathroom={noop} onSignedOut={noop} onFindPeople={noop} />],
  [
    "Profile (other)",
    () => <ProfileScreen userId={3} onBack={noop} onOpenBathroom={noop} onSignedOut={noop} onFindPeople={noop} />,
  ],
  ["App", () => <App />],
];

for (const [name, render] of screens) {
  test(`renders: ${name}`, () => {
    const html = renderToString(render());
    expect(html.length).toBeGreaterThan(50);
  });
}

test("the result screen paints the score and where it landed", () => {
  // React separates adjacent text nodes with `<!-- -->` in SSR output; strip them
  // so assertions read as the user sees the text, not as React emits it.
  const html = text(<CompareResultScreen result={result} onDone={noop} />);
  expect(html).toContain(result.review.score.toFixed(1));
  expect(html).toContain("YOUR SCORE");
  expect(html).toContain("NEW");
  expect(html).toContain(`#${result.rank} of ${result.rankings.length}`);
  // The leaderboard is gone: no medals anywhere.
  for (const medal of ["🥇", "🥈", "🥉"]) expect(html).not.toContain(medal);
});

test("the rate screen leads with one question, then four detail rows", () => {
  const html = text(<RateScoreScreen bathroom={bathroom} onBack={noop} onContinue={noop} />);
  expect(html).toContain("How was it?");
  expect(html).toContain("Pick a rating to continue");
  expect(html).toContain("Rate the details");
  expect(html).toContain("These don't affect the score");
  expect(html).toContain("Photos");

  // The detail rows are part of the form now, not hidden behind a disclosure,
  // and there are four of them, not six.
  for (const shown of ["Cleanliness", "Accessibility", "Smell", "Privacy"]) {
    expect(html).toContain(shown);
  }
  for (const gone of ["Hygiene", "Sanitary products"]) expect(html).not.toContain(gone);

  // Nothing is labelled "Optional" any more.
  expect(html).not.toContain("Optional");
});

test("a bathroom row names itself once, no building tile, no 'Floor N' filler", () => {
  const html = text(<RateScoreScreen bathroom={bathroom} onBack={noop} onContinue={noop} />);
  // The location line already reads "E5 3rd Floor, …", so nothing repeats it.
  expect(html).toContain(bathroom.location);
  expect(html).not.toContain(`Floor ${bathroom.floor}<`);
});
