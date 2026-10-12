import { eq } from "drizzle-orm";
import { intakeControls } from "../../drizzle/schema";
import { db, recordActivity } from "./tenant";
import type { IntakeControls } from "../../shared/analysis";
export async function getIntakeControls(
  companyId: number
): Promise<IntakeControls> {
  const [row] = await (await db())
    .select()
    .from(intakeControls)
    .where(eq(intakeControls.companyId, companyId));
  return {
    sourcingPaused: Boolean(row?.sourcingPaused),
    syncPaused: Boolean(row?.syncPaused),
  };
}
export async function saveIntakeControls(
  companyId: number,
  input: IntakeControls
) {
  const fields = {
    sourcingPaused: Number(input.sourcingPaused),
    syncPaused: Number(input.syncPaused),
  };
  await (
    await db()
  )
    .insert(intakeControls)
    .values({ companyId, ...fields })
    .onDuplicateKeyUpdate({ set: fields });
  await recordActivity(
    companyId,
    `Lead sourcing ${input.sourcingPaused ? "paused" : "resumed"}; provider sync ${input.syncPaused ? "paused" : "resumed"}. External running tasks are not cancelled.`,
    "controls"
  );
  return input;
}
export async function assertSourcingOpen(companyId: number) {
  if ((await getIntakeControls(companyId)).sourcingPaused)
    throw new Error(
      "Lead sourcing is paused. Resume sourcing before starting a new provider discovery. Manual link intake is still available."
    );
}
export async function assertSyncOpen(companyId: number) {
  if ((await getIntakeControls(companyId)).syncPaused)
    throw new Error(
      "Provider sync is paused. Resume syncing before fetching or importing provider results. Existing external work is not cancelled."
    );
}
