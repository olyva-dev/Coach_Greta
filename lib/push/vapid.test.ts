import { describe, expect, it } from "vitest";
import { vapidKeyProblem } from "./subscribe";

// A real P-256 uncompressed public key is 65 bytes, 87 base64url chars
const VALID = "B" + "A".repeat(86);

describe("vapid key validation", () => {
  it("accepts a well formed key", () => {
    expect(vapidKeyProblem(VALID)).toBeNull();
  });

  it("tolerates surrounding whitespace", () => {
    expect(vapidKeyProblem(`  ${VALID}\n`)).toBeNull();
  });

  it("reports a missing key", () => {
    expect(vapidKeyProblem(undefined)).toMatch(/not set/);
    expect(vapidKeyProblem("")).toMatch(/not set/);
  });

  it("catches the JSON key pair being pasted instead", () => {
    expect(vapidKeyProblem('{"publicKey":{"kty":"EC"}}')).toMatch(
      /JSON key pair/
    );
  });

  it("catches characters that are not base64url", () => {
    expect(vapidKeyProblem(`"${VALID}"`)).toMatch(/base64url/);
    expect(vapidKeyProblem(VALID.replace("A", "+"))).toMatch(/base64url/);
  });

  it("catches a key of the wrong length", () => {
    expect(vapidKeyProblem("BAAA")).toMatch(/characters, expected about 87/);
  });
});
