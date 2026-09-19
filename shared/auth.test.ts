import { expect, test } from "bun:test";
import { hasWhitespace, isValidEmail, usernameForStorage } from "./auth";

test("registration format helpers accept practical email and username input", () => {
  expect(isValidEmail("student@uwaterloo.ca")).toBe(true);
  expect(isValidEmail("student@uwaterloo")).toBe(false);
  expect(isValidEmail("student uwaterloo.ca")).toBe(false);
  expect(hasWhitespace("flush master")).toBe(true);
  expect(hasWhitespace("flushmaster")).toBe(false);
  expect(usernameForStorage("@flushmaster")).toBe("flushmaster");
});
