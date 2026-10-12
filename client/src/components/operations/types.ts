import type { OperationKind, OperationStatus } from "@shared/operations";

export type OperationSession = {
  id: string;
  kind: OperationKind;
  subject: string;
  stage: number;
  status: OperationStatus;
  detail: string;
  startedAt: Date;
  completedAt: Date | null;
  elapsedSeconds: number;
  busy: boolean;
  minimized: boolean;
  errorMessage: string | null;
  liveUpdateUnavailable: boolean;
};

export type OperationRunner = <T>(
  kind: OperationKind,
  subject: string,
  work: (operationId: string) => Promise<T>
) => Promise<T>;
