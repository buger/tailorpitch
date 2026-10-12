const LOOPBACK = ["127.0.0.1", "localhost", "::1"];
let active = false;
let startedAt: Date | null = null;
let lastCheckAt: Date | null = null;
let lastError: string | null = null;
export function workerConfiguration(env: NodeJS.ProcessEnv = process.env) {
  const mode = env.TAILORPITCH_AGENT_WORKER;
  return {
    configured:
      (mode === "local" || mode === "cloud") &&
      LOOPBACK.includes(env.HOST ?? ""),
    environment: mode === "cloud" ? ("cloud" as const) : ("local" as const),
    pollIntervalSeconds: 60,
  };
}
export function workerStatus() {
  return {
    ...workerConfiguration(),
    active,
    startedAt,
    lastCheckAt,
    lastError,
  };
}
export function markWorkerStarted() {
  active = true;
  startedAt = new Date();
  lastError = null;
}
export function markWorkerCheck(error: string | null = null) {
  lastCheckAt = new Date();
  lastError = error;
}
export function markWorkerStopped() {
  active = false;
}
