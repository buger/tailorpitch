import { describe, it, expect } from "vitest";
import { passwordResponseError } from "../shared/passwordResponse";
describe("login response errors", () => {
  it("shows clear retry instructions on an nginx HTML 429", () => {
    expect(
      passwordResponseError(429, "<html>Too many requests</html>")
    ).toContain("15 minutes");
  });
  it("keeps application errors clear and avoids reflecting proxy HTML", () => {
    expect(
      passwordResponseError(
        401,
        JSON.stringify({ error: "Email or password is incorrect." })
      )
    ).toBe("Email or password is incorrect.");
    expect(passwordResponseError(502, "<script>proxy error</script>")).toBe(
      "Sign-in is temporarily unavailable. Please try again shortly."
    );
  });
});
