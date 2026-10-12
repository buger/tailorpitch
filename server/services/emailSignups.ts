import { submissions } from "../../drizzle/schema";
import { db } from "./tenant";
// Keep the persisted source key: changing it would duplicate historical emails.
export const EARLY_ACCESS_SOURCE = "leadloom-waitlist";
export const EARLY_ACCESS_CONSENT =
  "I agree to occasional TailorPitch updates. Unsubscribe anytime.";
export async function saveEarlyAccessEmail(
  input: { email: string; consent: true; website: string },
  database: typeof db = db
): Promise<{ success: true }> {
  if (input.website) return { success: true };
  await (
    await database()
  )
    .insert(submissions)
    .values({
      email: input.email.trim().toLowerCase(),
      source: EARLY_ACCESS_SOURCE,
      consent: 1,
      consentText: EARLY_ACCESS_CONSENT,
    })
    .onDuplicateKeyUpdate({
      set: { consent: 1, consentText: EARLY_ACCESS_CONSENT },
    });
  // Success is returned only after MySQL acknowledges the write.
  return { success: true };
}
