import { describe, it, expect } from "vitest";
import { z } from "zod";
import { providerJsonSchema } from "./services/generation";
import { companyAnalysisSchema } from "../shared/analysis";
import { leadInputSchema } from "../shared/domain";
describe("provider JSON schema compatibility", () => {
  it("removes unsupported URI formats without weakening runtime URL validation", () => {
    const schema = providerJsonSchema(z.toJSONSchema(companyAnalysisSchema));
    expect(JSON.stringify(schema)).not.toContain('"format"');
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(Object.keys(schema.properties));
    expect(schema.properties.brand.required).toEqual(
      Object.keys(schema.properties.brand.properties)
    );
  });
  it("makes defaulted output fields required for strict model schemas", () => {
    const schema = providerJsonSchema(z.toJSONSchema(leadInputSchema));
    expect(schema.required).toContain("email");
    expect(schema.properties.email.default).toBeUndefined();
    expect(
      leadInputSchema.safeParse({
        companyName: "Example",
        website: "http://example.com",
        icpId: null,
      }).success
    ).toBe(false);
  });
});
