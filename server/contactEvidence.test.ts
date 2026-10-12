import { describe, it, expect } from "vitest";
import {
  observedContact,
  clearUnobservedContacts,
} from "./services/contactEvidence";
describe("literal contact provenance", () => {
  it("does not match tiny names or substrings in unrelated words", () => {
    expect(observedContact("A", "Acme")).toBe(false);
    expect(observedContact("Ann", "annual review")).toBe(false);
    expect(observedContact("CTO", "FACTORY")).toBe(false);
    expect(observedContact("Jane Doe", "Our CTO is Jane Doe.")).toBe(true);
  });
  it("clears invented contact and social details while preserving an observed email", () => {
    const c = {
      email: "hello@example.com",
      contactName: "Invented Founder",
      title: "CTO",
      linkedinUrl: "https://linkedin.com/in/fake",
      xUrl: "",
    };
    clearUnobservedContacts(c, "Contact hello@example.com for questions.");
    expect(c.email).toBe("hello@example.com");
    expect(c.contactName).toBe("");
    expect(c.title).toBe("");
    expect(c.linkedinUrl).toBe("");
  });
});
