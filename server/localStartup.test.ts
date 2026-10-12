import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Source-level checks avoid booting a server or seeding the shared database.
describe("local startup compatibility", () => {
  const source = readFileSync(new URL("./_core/index.ts", import.meta.url), "utf8");

  it("accepts a local bind host without changing the production default", () => {
    expect(source).toContain('const host = process.env.HOST || "0.0.0.0"');
    expect(source).toContain("server.listen(port, host");
  });

  it("uses a runtime port rather than hardcoding the Mac session port", () => {
    expect(source).toContain('Number(process.env.PORT || "3000")');
    expect(source).not.toContain("5175");
  });
});
