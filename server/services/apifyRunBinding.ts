import { createHmac, timingSafeEqual } from "node:crypto";
import { ENV } from "../_core/env";
type RunRequest = {
  companyId: number;
  id: number;
  type: string;
  actorId: string | null;
  sourcePlanId: number | null;
  query: string | null;
  requestedLimit: number;
};
export function runBinding(run: RunRequest) {
  if (!ENV.cookieSecret || !ENV.appId)
    throw new Error(
      "Provider run signing is unavailable. Contact the TailorPitch owner."
    );
  return createHmac("sha256", ENV.cookieSecret)
    .update(
      JSON.stringify([
        "tailorpitch-apify-v1",
        ENV.appId,
        run.companyId,
        run.id,
        run.type,
        run.actorId,
        run.sourcePlanId,
        run.query,
        run.requestedLimit,
      ])
    )
    .digest("hex");
}
export function assertRunBinding(run: RunRequest, input: unknown) {
  const marker = (input as Record<string, unknown> | null)
    ?._tailorpitchCorrelation;
  const expected = runBinding(run);
  if (
    typeof marker !== "string" ||
    marker.length !== expected.length ||
    !timingSafeEqual(Buffer.from(marker), Buffer.from(expected))
  )
    throw new Error(
      "This provider run is not verifiably bound to this company and internal run. It cannot be attached. Legacy or unrelated runs need server-administrator review."
    );
}
export function assertMatchingActiveRun(
  existing: Pick<
    RunRequest,
    "sourcePlanId" | "actorId" | "query" | "requestedLimit"
  >,
  request: Pick<
    RunRequest,
    "sourcePlanId" | "actorId" | "query" | "requestedLimit"
  >
) {
  if (
    existing.sourcePlanId !== request.sourcePlanId ||
    existing.actorId !== request.actorId ||
    existing.query !== request.query ||
    existing.requestedLimit !== request.requestedLimit
  )
    throw new Error(
      "A different source strategy or volume already has an active run for this ICP or lead. Finish or reconcile that original run first; TailorPitch will not reuse it as the newly approved request."
    );
}
export function providerJobNeedsSync(job: {
  provider: string;
  sourceRunId?: number | null;
  manusTaskId?: string | null;
}) {
  return (
    job.provider !== "generation" || Boolean(job.sourceRunId || job.manusTaskId)
  );
}
