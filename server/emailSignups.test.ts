import { describe, it, expect, vi } from "vitest";
import {
  saveEarlyAccessEmail,
  EARLY_ACCESS_SOURCE,
  EARLY_ACCESS_CONSENT,
} from "./services/emailSignups";
import { signupCsv, signupSourceLabel } from "../shared/emailSignups";
import { submissions } from "../drizzle/schema";
function fixture(completion: Promise<unknown> = Promise.resolve()) {
  const duplicate = vi.fn(() => completion);
  const values = vi.fn(() => ({ onDuplicateKeyUpdate: duplicate }));
  const insert = vi.fn(() => ({ values }));
  const db = vi.fn(async () => ({ insert }));
  return { db, insert, values, duplicate };
}
describe("durable email signups", () => {
  it("normalizes email and awaits database acknowledgment before success", async () => {
    let finish!: () => void;
    const f = fixture(
      new Promise<void>(resolve => {
        finish = resolve;
      })
    );
    let done = false;
    const result = saveEarlyAccessEmail(
      { email: " USER@Example.com ", consent: true, website: "" },
      f.db as any
    ).then(r => {
      done = true;
      return r;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(done).toBe(false);
    expect(f.insert).toHaveBeenCalledWith(submissions);
    expect(f.values).toHaveBeenCalledWith({
      email: "user@example.com",
      source: EARLY_ACCESS_SOURCE,
      consent: 1,
      consentText: EARLY_ACCESS_CONSENT,
    });
    expect(f.duplicate).toHaveBeenCalledWith({
      set: { consent: 1, consentText: EARLY_ACCESS_CONSENT },
    });
    finish();
    expect(await result).toEqual({ success: true });
  });
  it("does not write bot honeypot entries", async () => {
    const f = fixture();
    await saveEarlyAccessEmail(
      { email: "bot@example.com", consent: true, website: "spam" },
      f.db as any
    );
    expect(f.db).not.toHaveBeenCalled();
  });
  it("does not report success if durable insertion fails", async () => {
    const f = fixture();
    f.duplicate.mockImplementation(async () => {
      throw Error("Database unavailable");
    });
    await expect(
      saveEarlyAccessEmail(
        { email: "test@example.com", consent: true, website: "" },
        f.db as any
      )
    ).rejects.toThrow("Database unavailable");
  });
  it("keeps historical source compatible and export readable/formula-safe", () => {
    expect(signupSourceLabel("leadloom-waitlist")).toBe(
      "TailorPitch early access"
    );
    expect(signupSourceLabel("page-12")).toBe("Personalized page #12");
    const csv = signupCsv([
      {
        email: "+formula@example.com",
        source: EARLY_ACCESS_SOURCE,
        consent: 1,
        consentText: 'I agree to "updates"',
        createdAt: new Date("2026-10-12T11:00:00Z"),
      },
    ]);
    expect(csv).toContain('"\'+formula@example.com"');
    expect(csv).toContain('"I agree to ""updates"""');
    expect(csv).toContain("2026-10-12T11:00:00.000Z");
  });
});
