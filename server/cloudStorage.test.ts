import { describe, it, expect } from "vitest";
import { validStorageKey } from "./services/cloudStorage";
describe("cloud storage key boundary", () => {
  it("accepts observed relative object keys", () => {
    expect(validStorageKey("proof/references/board_123.png")).toBe(true);
  });
  it("rejects traversal, URLs, empty segments and query injection", () => {
    for (const key of [
      "",
      "../secret",
      "proof/../secret",
      "/key",
      "a//b",
      "https://evil.example/a",
      "a?x=b",
      "a%2fb",
      "a\\b",
      "a/./b",
      "x".repeat(1001),
    ])
      expect(validStorageKey(key)).toBe(false);
  });
});
