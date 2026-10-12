import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from "./tenant";
import { operationProgress } from "../../drizzle/schema";
import {
  operationDefinitions,
  type OperationKind,
  type OperationSnapshot,
  type ProgressReporter,
} from "../../shared/operations";
export type OperationScope = { companyId: number; userId: number };
export function operationScopeConditions(scope: OperationScope, id: string) {
  return and(
    eq(operationProgress.id, id),
    eq(operationProgress.companyId, scope.companyId),
    eq(operationProgress.userId, scope.userId)
  );
}
export function reportedSnapshot(
  row: typeof operationProgress.$inferSelect,
  now = Date.now()
): OperationSnapshot {
  return {
    ...row,
    status:
      row.status === "running" && now - row.updatedAt.getTime() > 10 * 60 * 1000
        ? "interrupted"
        : row.status,
  };
}
export async function getOperation(scope: OperationScope, id: string) {
  const [row] = await (await db())
    .select()
    .from(operationProgress)
    .where(operationScopeConditions(scope, id))
    .limit(1);
  return row ? reportedSnapshot(row) : null;
}
export async function withObservedOperation<T>(
  scope: OperationScope,
  kind: OperationKind,
  id: string | undefined,
  work: (report: ProgressReporter) => Promise<T>
): Promise<T> {
  if (!id) return work(async () => {}); // Older clients still use the original request/response contract.
  const database = await db();
  try {
    await database.insert(operationProgress).values({ id, ...scope, kind });
  } catch (error) {
    const [existing] = await database
      .select({ id: operationProgress.id })
      .from(operationProgress)
      .where(eq(operationProgress.id, id))
      .limit(1);
    if (existing)
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "This request ID was already used. Check the existing result before starting another request.",
      });
    throw error;
  }
  let stage = 0;
  const update = async (
    values: Partial<typeof operationProgress.$inferInsert>
  ) => {
    try {
      await database
        .update(operationProgress)
        .set({ ...values, updatedAt: new Date() })
        .where(operationScopeConditions(scope, id));
    } catch {
      console.warn(
        "[Progress] A status update was unavailable. The original operation continues."
      );
    }
  };
  const report: ProgressReporter = async (index, detail) => {
    if (
      !Number.isInteger(index) ||
      index < stage ||
      index >= operationDefinitions[kind].steps.length
    )
      throw new Error("Invalid operation stage transition.");
    stage = index;
    await update({
      stage,
      detail: (detail ?? operationDefinitions[kind].steps[index]).slice(0, 700),
    });
  };
  try {
    const result = await work(report);
    await update({
      status: "succeeded",
      stage: operationDefinitions[kind].steps.length,
      detail: operationDefinitions[kind].ready,
      completedAt: new Date(),
    });
    return result;
  } catch (error) {
    await update({
      status: "failed",
      stage,
      detail:
        "The request did not finish normally. Review the action’s error before trying again.",
      completedAt: new Date(),
    });
    throw error;
  }
}
