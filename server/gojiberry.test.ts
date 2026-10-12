import { describe, it, expect, vi } from "vitest";
import type { Response } from "express";
import {
  bindGojiberryStateCookie,
  GOJIBERRY_COOKIE_PATH,
  GOJIBERRY_CALLBACK_PATH,
  GOJIBERRY_ENDPOINT,
} from "./services/gojiberry";
describe("Gojiberry OAuth browser binding", () => {
  it("uses a secure HttpOnly cross-site cookie scoped to the callback routes", () => {
    const cookie = vi.fn();
    const response = { cookie } as unknown as Response;
    bindGojiberryStateCookie(
      response,
      "a".repeat(48),
      "https://tailorpitch.com"
    );
    expect(cookie).toHaveBeenCalledTimes(1);
    const [, value, options] = cookie.mock.calls[0];
    expect(value).toBe("a".repeat(48));
    expect(options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: GOJIBERRY_COOKIE_PATH,
    });
  });
  it("rejects weak state and insecure browser origins", () => {
    const response = { cookie: vi.fn() } as unknown as Response;
    expect(() =>
      bindGojiberryStateCookie(response, "short", "https://tailorpitch.com")
    ).toThrow();
    expect(() =>
      bindGojiberryStateCookie(
        response,
        "a".repeat(48),
        "http://tailorpitch.com"
      )
    ).toThrow();
  });
  it("pins the real provider and callback surface rather than a user-supplied token endpoint", () => {
    expect(GOJIBERRY_ENDPOINT).toBe("https://mcp.gojiberry.ai/mcp");
    expect(GOJIBERRY_CALLBACK_PATH).toBe(
      "/api/integrations/gojiberry/callback"
    );
  });
});
