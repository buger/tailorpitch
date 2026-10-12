import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  PlugZap,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { api } from "@/components/leadloom-types";
import {
  Button,
  MonoLabel,
  StatusChip,
  TextInput,
} from "@/components/LeadloomUI";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

type ToolView = {
  name: string;
  description: string;
  inputSchema: unknown;
};

function normalizeTools(value: unknown): ToolView[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!isRecord(item) || typeof item.name !== "string") return [];
    return [
      {
        name: item.name,
        description: textValue(item.description),
        inputSchema: item.inputSchema,
      },
    ];
  });
}

function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function parseArguments(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function TailorPitchIntegrations() {
  const gojiberryStatus = api.gojiberry.status.useQuery(undefined, {
    retry: false,
  });
  const gojiberryTools = api.gojiberry.listTools.useQuery(undefined, {
    retry: false,
    enabled: Boolean(gojiberryStatus.data?.connected),
  });
  const gojiberryConnect = api.gojiberry.connect.useMutation();
  const gojiberryTest = api.gojiberry.test.useMutation();
  const gojiberryDisconnect = api.gojiberry.disconnect.useMutation();

  const manusStatus = api.manus.status.useQuery(undefined, { retry: false });
  const manusConnect = api.manus.connect.useMutation();
  const manusTest = api.manus.test.useMutation();
  const manusDisconnect = api.manus.disconnect.useMutation();

  const [manusApiKey, setManusApiKey] = useState("");
  const [toolName, setToolName] = useState("");
  const [toolArgs, setToolArgs] = useState("{}");
  const [toolArgsError, setToolArgsError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<unknown>(null);
  const [message, setMessage] = useState<string | null>(null);

  const discoveredTools = useMemo(
    () => normalizeTools(gojiberryTools.data),
    [gojiberryTools.data]
  );
  const selectedTool = discoveredTools.find(tool => tool.name === toolName);

  useEffect(() => {
    if (toolName && !selectedTool) setToolName("");
  }, [selectedTool, toolName]);

  const connectGojiberry = async () => {
    try {
      const result = await gojiberryConnect.mutateAsync({
        origin: window.location.origin,
      });
      // The server returns the OAuth/connection URL; credentials never enter browser storage.
      window.location.assign(result.url);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Gojiberry connection could not start."
      );
    }
  };

  const disconnectGojiberry = async () => {
    try {
      await gojiberryDisconnect.mutateAsync();
      setToolName("");
      setTestResult(null);
      setMessage("Gojiberry disconnected.");
      await gojiberryStatus.refetch();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Gojiberry could not be disconnected."
      );
    }
  };

  const testGojiberry = async () => {
    if (!selectedTool) {
      setMessage("Choose a discovered Gojiberry tool before testing.");
      return;
    }
    const args = parseArguments(toolArgs);
    if (!args) {
      setToolArgsError(
        "Use a JSON object that matches the selected tool schema."
      );
      return;
    }
    setToolArgsError(null);
    try {
      const result = await gojiberryTest.mutateAsync({
        name: selectedTool.name,
        args,
      });
      setTestResult(result);
      setMessage("Read-only Gojiberry test completed.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Gojiberry test failed."
      );
    }
  };

  const connectManus = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await manusConnect.mutateAsync({ apiKey: manusApiKey });
      // Clear the secret immediately after the server confirms success.
      setManusApiKey("");
      setMessage("Manus connected.");
      await manusStatus.refetch();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Manus connection failed."
      );
    }
  };

  const testManus = async () => {
    try {
      const result = await manusTest.mutateAsync();
      setTestResult(result);
      setMessage("Manus account check completed.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Manus account check failed."
      );
    }
  };

  const disconnectManus = async () => {
    try {
      await manusDisconnect.mutateAsync();
      setTestResult(null);
      setMessage("Manus disconnected.");
      await manusStatus.refetch();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Manus could not be disconnected."
      );
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="border border-line bg-white p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <MonoLabel>Gojiberry / MCP connection</MonoLabel>
            <h2 className="mt-2 font-display text-2xl tracking-[-.04em]">
              Use a real tool, not a guessed one.
            </h2>
          </div>
          <PlugZap className="h-5 w-5 text-terracotta" />
        </div>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          Connect through the server-managed flow, discover the actual tool
          annotations, then choose a tool and arguments explicitly for a
          read-only test.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <StatusChip
            tone={gojiberryStatus.data?.connected ? "good" : "neutral"}
          >
            {gojiberryStatus.data?.connected ? "Connected" : "Not connected"}
          </StatusChip>
          {gojiberryStatus.data?.needsReconnect && (
            <StatusChip tone="warn">Needs reconnect</StatusChip>
          )}
        </div>
        {!gojiberryStatus.data?.connected ? (
          <Button
            className="mt-5"
            onClick={() => void connectGojiberry()}
            disabled={gojiberryConnect.isPending}
          >
            <ExternalLink className="h-4 w-4" />
            {gojiberryConnect.isPending ? "Opening…" : "Connect Gojiberry"}
          </Button>
        ) : (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => void gojiberryTools.refetch()}
              disabled={gojiberryTools.isFetching}
            >
              <RefreshCw
                className={`h-4 w-4 ${gojiberryTools.isFetching ? "animate-spin" : ""}`}
              />
              Refresh tools
            </Button>
            <Button
              variant="ghost"
              onClick={() => void disconnectGojiberry()}
              disabled={gojiberryDisconnect.isPending}
            >
              <Unplug className="h-4 w-4" />
              Disconnect
            </Button>
          </div>
        )}
        {gojiberryStatus.error && (
          <p className="mt-4 text-xs leading-5 text-red-700">
            Status unavailable: {gojiberryStatus.error.message}
          </p>
        )}
        {gojiberryTools.error && (
          <p className="mt-4 text-xs leading-5 text-red-700">
            Tool discovery unavailable: {gojiberryTools.error.message}
          </p>
        )}
        {gojiberryStatus.data?.connected && (
          <div className="mt-7 border-t border-line pt-5">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold">
                Discovered tool
              </span>
              <select
                value={toolName}
                onChange={event => {
                  setToolName(event.target.value);
                  setTestResult(null);
                }}
                className="w-full rounded-sm border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
              >
                <option value="">Choose a tool from the live list</option>
                {discoveredTools.map(tool => (
                  <option key={tool.name} value={tool.name}>
                    {tool.name}
                  </option>
                ))}
              </select>
            </label>
            {selectedTool ? (
              <>
                <p className="mt-3 text-xs leading-5 text-ink-muted">
                  {selectedTool.description ||
                    "No description returned by the provider."}
                </p>
                <details className="mt-4 border border-line bg-paper p-3">
                  <summary className="cursor-pointer text-xs font-semibold">
                    View full input schema
                  </summary>
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-ink-muted">
                    {pretty(selectedTool.inputSchema || {})}
                  </pre>
                </details>
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-xs font-semibold">
                    Test arguments / JSON object
                  </span>
                  <textarea
                    value={toolArgs}
                    onChange={event => {
                      setToolArgs(event.target.value);
                      setToolArgsError(null);
                    }}
                    className={`min-h-28 w-full resize-y rounded-sm border bg-white px-3 py-2.5 font-mono text-xs outline-none focus:border-terracotta ${toolArgsError ? "border-red-300" : "border-line"}`}
                    spellCheck={false}
                  />
                  {toolArgsError && (
                    <span className="mt-1 block text-[11px] text-red-700">
                      {toolArgsError}
                    </span>
                  )}
                </label>
                <Button
                  className="mt-4"
                  variant="secondary"
                  onClick={() => void testGojiberry()}
                  disabled={gojiberryTest.isPending || !toolName}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {gojiberryTest.isPending ? "Testing…" : "Run read-only test"}
                </Button>
              </>
            ) : (
              <p className="mt-4 border border-dashed border-line p-4 text-xs leading-5 text-ink-muted">
                Choose an actual discovered tool to reveal its schema. No
                automatic or guessed test calls are sent.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="border border-line bg-white p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <MonoLabel>Manus / project access</MonoLabel>
            <h2 className="mt-2 font-display text-2xl tracking-[-.04em]">
              Keep the key out of the browser.
            </h2>
          </div>
          <KeyRound className="h-5 w-5 text-terracotta" />
        </div>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          The API key is submitted over the authenticated connection, never
          logged or persisted in browser storage, and cleared after a successful
          connection.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <StatusChip tone={manusStatus.data?.connected ? "good" : "neutral"}>
            {manusStatus.data?.connected ? "Connected" : "Not connected"}
          </StatusChip>
          {manusStatus.data?.accountName && (
            <span className="text-xs text-ink-muted">
              {manusStatus.data.accountName}
            </span>
          )}
        </div>
        <form className="mt-6 space-y-4" onSubmit={connectManus}>
          <TextInput
            label="Manus API key"
            type="password"
            value={manusApiKey}
            onChange={event => setManusApiKey(event.target.value)}
            autoComplete="new-password"
            required={!manusStatus.data?.connected}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={manusConnect.isPending || !manusApiKey}
            >
              {manusConnect.isPending
                ? "Connecting…"
                : manusStatus.data?.connected
                  ? "Replace key"
                  : "Connect Manus"}
            </Button>
            {manusStatus.data?.connected && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void testManus()}
                  disabled={manusTest.isPending}
                >
                  {manusTest.isPending ? "Checking…" : "Test account"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void disconnectManus()}
                  disabled={manusDisconnect.isPending}
                >
                  <Unplug className="h-4 w-4" />
                  Disconnect
                </Button>
              </>
            )}
          </div>
        </form>
        {manusStatus.error && (
          <p className="mt-4 text-xs leading-5 text-red-700">
            Status unavailable: {manusStatus.error.message}
          </p>
        )}
      </section>

      {testResult !== null && (
        <section className="border border-line bg-paper p-5 xl:col-span-2">
          <MonoLabel>Latest explicit test result</MonoLabel>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-ink-muted">
            {pretty(testResult)}
          </pre>
        </section>
      )}
      {message && (
        <div
          className="border border-sage/40 bg-sage-soft p-4 text-sm leading-6 text-sage-ink"
          role="status"
        >
          {message}
        </div>
      )}
    </div>
  );
}

export default TailorPitchIntegrations;
