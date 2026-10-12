import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/components/leadloom-types";
import {
  operationDefinitions,
  type OperationKind,
  type OperationSnapshot,
  type OperationStatus,
} from "@shared/operations";
import { ProgressWindow } from "./ProgressWindow";
import type { OperationRunner, OperationSession } from "./types";

const STARTING_DETAIL = "Starting the request…";
const OPERATION_POLL_MS = 1500;

type InternalSession = Omit<OperationSession, "elapsedSeconds">;

const OperationContext = createContext<{
  run: OperationRunner;
  busy: boolean;
} | null>(null);

function isPending(session: InternalSession | null) {
  return Boolean(session?.busy);
}

function clampStage(kind: OperationKind, stage: number) {
  const lastStage = operationDefinitions[kind].steps.length - 1;
  if (!Number.isFinite(stage)) return 0;
  return Math.min(lastStage, Math.max(0, Math.floor(stage)));
}

function rawActionMessage(caught: unknown) {
  if (caught instanceof Error && caught.message.trim()) return caught.message;
  if (typeof caught === "string" && caught.trim()) return caught;
  return "The request could not be completed.";
}

function sameOperation(
  current: InternalSession | null,
  operationId: string
): current is InternalSession {
  return Boolean(current && current.id === operationId);
}

export function OperationProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<InternalSession | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const busyRef = useRef(false);
  const observedSnapshotRef = useRef<OperationSnapshot | null>(null);
  const operationId = session?.id ?? "";
  const shouldPoll = isPending(session);

  const operationQuery = api.operations.get.useQuery(
    { id: operationId },
    {
      enabled: Boolean(operationId) && shouldPoll,
      refetchInterval: shouldPoll ? OPERATION_POLL_MS : false,
      retry: false,
    }
  );
  const observedSnapshot =
    operationQuery.data && operationQuery.data.id === operationId
      ? operationQuery.data
      : null;
  observedSnapshotRef.current = observedSnapshot;

  useEffect(() => {
    if (!session?.busy) return;
    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [session?.busy, session?.id]);

  const run = useCallback<OperationRunner>(async function runOperation<T>(
    kind: OperationKind,
    subject: string,
    work: (operationId: string) => Promise<T>
  ) {
    if (busyRef.current) {
      throw new Error("Another request is already in progress.");
    }

    busyRef.current = true;
    const id = globalThis.crypto.randomUUID();
    const startedAt = new Date();
    setClock(startedAt.getTime());
    setSession({
      id,
      kind,
      subject,
      stage: 0,
      status: "running",
      detail: STARTING_DETAIL,
      startedAt,
      completedAt: null,
      busy: true,
      minimized: false,
      errorMessage: null,
      liveUpdateUnavailable: false,
    });

    try {
      const result = await work(id);
      const completedAt = new Date();
      setSession(current => {
        if (!sameOperation(current, id)) return current;
        return {
          ...current,
          stage: operationDefinitions[kind].steps.length - 1,
          status: "succeeded",
          detail: operationDefinitions[kind].ready,
          completedAt,
          busy: false,
          errorMessage: null,
        };
      });
      return result;
    } catch (caught) {
      const completedAt = new Date();
      const message = rawActionMessage(caught);
      const latestSnapshot = observedSnapshotRef.current;
      setSession(current => {
        if (!sameOperation(current, id)) return current;
        return {
          ...current,
          stage:
            latestSnapshot?.id === id
              ? clampStage(kind, latestSnapshot.stage)
              : current.stage,
          status: "failed",
          detail: message,
          completedAt,
          busy: false,
          errorMessage: message,
        };
      });
      throw caught;
    } finally {
      busyRef.current = false;
    }
  }, []);

  const viewSession = useMemo<OperationSession | null>(() => {
    if (!session) return null;

    // A terminal local result wins over a late running snapshot for this id.
    // This prevents a poll that crossed the callback resolution from reopening
    // or downgrading the result shown to the user.
    const localTerminal = !session.busy;
    const status: OperationStatus = localTerminal
      ? session.status
      : observedSnapshot?.status === "interrupted"
        ? "interrupted"
        : "running";
    const stage = localTerminal
      ? session.stage
      : observedSnapshot
        ? clampStage(session.kind, observedSnapshot.stage)
        : session.stage;
    const detail = localTerminal
      ? session.detail
      : observedSnapshot?.detail || session.detail;
    const elapsedEnd = session.completedAt?.getTime() ?? clock;

    return {
      ...session,
      status,
      stage,
      detail,
      elapsedSeconds: Math.max(
        0,
        (elapsedEnd - session.startedAt.getTime()) / 1000
      ),
      liveUpdateUnavailable: Boolean(operationQuery.error),
    };
  }, [clock, observedSnapshot, operationQuery.error, session]);

  const dismiss = useCallback(() => {
    setSession(current => (current && current.busy ? current : null));
  }, []);

  const minimize = useCallback(() => {
    setSession(current => {
      if (!current) return current;
      return { ...current, minimized: true };
    });
  }, []);

  const restore = useCallback(() => {
    setSession(current => {
      if (!current) return current;
      return { ...current, minimized: false };
    });
  }, []);

  const contextValue = useMemo(
    () => ({ run, busy: Boolean(session?.busy) }),
    [run, session?.busy]
  );

  return (
    <OperationContext.Provider value={contextValue}>
      {children}
      {viewSession && (
        <ProgressWindow
          session={viewSession}
          onMinimize={minimize}
          onRestore={restore}
          onDismiss={dismiss}
        />
      )}
    </OperationContext.Provider>
  );
}

export function useOperation() {
  const context = useContext(OperationContext);
  if (!context) {
    throw new Error("useOperation must be used within an OperationProvider");
  }
  return context;
}

export { STARTING_DETAIL, OPERATION_POLL_MS };
