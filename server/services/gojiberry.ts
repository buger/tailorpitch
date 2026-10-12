import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import { parse as parseCookie } from "cookie";
import { and, eq, gt, isNull } from "drizzle-orm";
import Ajv from "ajv";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  auth,
  type OAuthClientProvider,
  type OAuthDiscoveryState,
} from "@modelcontextprotocol/sdk/client/auth.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  companies,
  integrations,
  memberships,
  mcpOAuthSessions,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { sdk } from "../_core/sdk";
import {
  decryptConfig,
  encryptConfig,
  getIntegration,
  saveIntegration,
} from "./credentials";

export const GOJIBERRY_ENDPOINT = "https://mcp.gojiberry.ai/mcp";
export const GOJIBERRY_RESOURCE_METADATA_URL =
  "https://mcp.gojiberry.ai/.well-known/oauth-protected-resource/mcp";
export const GOJIBERRY_AUTHORIZATION_SERVER = "https://mcp.gojiberry.ai";
export const GOJIBERRY_CALLBACK_PATH = "/api/integrations/gojiberry/callback";
export const GOJIBERRY_COOKIE_PATH = "/api/integrations/gojiberry";

const GOJIBERRY_PROVIDER = "gojiberry";
const GOJIBERRY_SESSION_PROVIDER = "gojiberry-session";
const GOJIBERRY_STATE_COOKIE = "leadloom_gojiberry_oauth_state";
const GOJIBERRY_SCOPE = "mcp:tools claudeai";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const AUTH_REFRESH_SKEW_MS = 60_000;
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_TOOL_PAGES = 10;
const MAX_TOOL_RESULT_BYTES = 1024 * 1024;
const DISPLAY_NAME = "Gojiberry AI";

const ajv = new Ajv({ allErrors: true, strict: false });

/** The only OAuth resource and authorization server accepted for this integration. */
const EXPECTED_RESOURCE = GOJIBERRY_ENDPOINT;
const EXPECTED_AUTH_SERVER = GOJIBERRY_AUTHORIZATION_SERVER;

export type GojiberryTool = {
  name: string;
  title?: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  safeReadOnly: boolean;
};

export type GojiberryToolCatalogue = GojiberryTool[];

export type GojiberryStatus = {
  connected: boolean;
  needsReconnect: boolean;
  displayName?: string;
};

type GojiberryOAuthConfig = {
  clientInformation: OAuthClientInformationMixed;
  tokens: OAuthTokens;
  expiresAt: number;
  discoveryState?: OAuthDiscoveryState;
};

type GojiberryOAuthSession = {
  state: string;
  origin: string;
  redirectUri: string;
  codeVerifier: string;
  clientInformation: OAuthClientInformationMixed;
  discoveryState?: OAuthDiscoveryState;
};

type OAuthProviderState = {
  clientInformation?: OAuthClientInformationMixed;
  tokens?: OAuthTokens;
  codeVerifier?: string;
  discoveryState?: OAuthDiscoveryState;
  authorizationUrl?: string;
};

type ToolCallSelection = {
  name: string;
  args?: unknown;
};

function requiredDb() {
  return getDb().then(database => {
    if (!database) throw new Error("Database is not available");
    return database;
  });
}

function assertCompanyId(companyId: number): void {
  if (!Number.isInteger(companyId) || companyId <= 0)
    throw new Error("Invalid company");
}

function assertUserId(userId: number): void {
  if (!Number.isInteger(userId) || userId <= 0) throw new Error("Invalid user");
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sameSecret(left: string, right: string): boolean {
  const a = Buffer.from(sha256(left), "hex");
  const b = Buffer.from(sha256(right), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function oneQueryValue(value: unknown, max = 4096): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= max
    ? value
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function canonicalHttpsOrigin(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Invalid frontend origin");
  }
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    parsed.port ||
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Invalid frontend origin");
  }
  return parsed.origin;
}

function configuredPreviewOrigins(): Set<string> {
  const origins = new Set<string>();
  for (const key of [
    "MANUS_ADDON_PREVIEW_PUBLIC_ORIGIN",
    "MANUS_ADDON_RUNTIME_PUBLIC_ORIGIN",
    "MANUS_PREVIEW_PUBLIC_ORIGIN",
    "MANUS_PREVIEW_ORIGIN",
    "PUBLIC_ORIGIN",
    "APP_ORIGIN",
    "FRONTEND_ORIGIN",
  ]) {
    const value = process.env[key];
    if (!value) continue;
    try {
      origins.add(canonicalHttpsOrigin(value));
    } catch {
      // Ignore malformed optional deployment configuration.
    }
  }
  return origins;
}

async function trustedOrigin(
  companyId: number,
  origin: string
): Promise<string> {
  assertCompanyId(companyId);
  const requested = canonicalHttpsOrigin(origin);
  const database = await requiredDb();
  const rows = await database
    .select({ publicOrigin: companies.publicOrigin })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  if (!rows[0]) throw new Error("Invalid company");

  const approved = configuredPreviewOrigins();
  if (rows[0].publicOrigin) {
    try {
      approved.add(canonicalHttpsOrigin(rows[0].publicOrigin));
    } catch {
      // A stale company origin is not trusted.
    }
  }
  if (!approved.has(requested))
    throw new Error("Frontend origin is not approved");
  return requested;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    path: GOJIBERRY_COOKIE_PATH,
    maxAge: OAUTH_STATE_TTL_MS,
  };
}

function validateOAuthResource(resource: string | URL | undefined): URL {
  if (resource === undefined) return new URL(EXPECTED_RESOURCE);
  if (String(resource) !== EXPECTED_RESOURCE)
    throw new Error("Gojiberry OAuth resource is invalid");
  return new URL(EXPECTED_RESOURCE);
}

function normalizedUrl(value: unknown): string | null {
  if (typeof value !== "string" && !(value instanceof URL)) return null;
  try {
    return new URL(String(value)).toString();
  } catch {
    return null;
  }
}

function assertExpectedUrl(value: unknown, expected: string): void {
  if (normalizedUrl(value) !== normalizedUrl(expected))
    throw new Error("Gojiberry OAuth discovery is invalid");
}

function validateDiscovery(
  discovery: OAuthDiscoveryState
): OAuthDiscoveryState {
  assertExpectedUrl(discovery.authorizationServerUrl, EXPECTED_AUTH_SERVER);
  const resourceMetadata = discovery.resourceMetadata;
  if (!isRecord(resourceMetadata))
    throw new Error("Gojiberry OAuth discovery is invalid");
  assertExpectedUrl(resourceMetadata.resource, EXPECTED_RESOURCE);
  if (
    !Array.isArray(resourceMetadata.authorization_servers) ||
    resourceMetadata.authorization_servers.length !== 1 ||
    normalizedUrl(resourceMetadata.authorization_servers[0]) !==
      normalizedUrl(EXPECTED_AUTH_SERVER)
  ) {
    throw new Error("Gojiberry OAuth discovery is invalid");
  }

  const metadata = discovery.authorizationServerMetadata;
  if (!isRecord(metadata))
    throw new Error("Gojiberry OAuth discovery is invalid");
  assertExpectedUrl(metadata.issuer, EXPECTED_AUTH_SERVER);
  assertExpectedUrl(
    metadata.authorization_endpoint,
    `${EXPECTED_AUTH_SERVER}/authorize`
  );
  assertExpectedUrl(metadata.token_endpoint, `${EXPECTED_AUTH_SERVER}/token`);
  assertExpectedUrl(
    metadata.registration_endpoint,
    `${EXPECTED_AUTH_SERVER}/register`
  );

  const includes = (key: string, values: string[]) => {
    const actual = (metadata as Record<string, unknown>)[key];
    return (
      Array.isArray(actual) &&
      values.every(value => actual.some(item => String(item) === value))
    );
  };
  if (!includes("response_types_supported", ["code"]))
    throw new Error("Gojiberry OAuth discovery is invalid");
  if (
    !includes("grant_types_supported", ["authorization_code", "refresh_token"])
  )
    throw new Error("Gojiberry OAuth discovery is invalid");
  if (!includes("code_challenge_methods_supported", ["S256"]))
    throw new Error("Gojiberry OAuth discovery is invalid");
  if (
    !includes("token_endpoint_auth_methods_supported", [
      "none",
      "client_secret_post",
    ])
  ) {
    throw new Error("Gojiberry OAuth discovery is invalid");
  }
  if (!includes("scopes_supported", ["mcp:tools", "claudeai"]))
    throw new Error("Gojiberry OAuth discovery is invalid");
  return discovery;
}

function clientMetadata(redirectUri: string): OAuthClientMetadata {
  return {
    redirect_uris: [redirectUri],
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    client_name: "Leadloom Gojiberry integration",
    scope: GOJIBERRY_SCOPE,
  };
}

function createOAuthProvider(
  redirectUri: string,
  state: OAuthProviderState,
  fixedState?: string
): OAuthClientProvider {
  const provider: OAuthClientProvider = {
    redirectUrl: redirectUri,
    clientMetadata: clientMetadata(redirectUri),
    clientInformation: () => state.clientInformation,
    saveClientInformation: information => {
      state.clientInformation = information;
    },
    tokens: () => state.tokens,
    saveTokens: tokens => {
      state.tokens = tokens;
    },
    state: fixedState ? () => fixedState : undefined,
    redirectToAuthorization: authorizationUrl => {
      state.authorizationUrl = String(authorizationUrl);
    },
    saveCodeVerifier: codeVerifier => {
      state.codeVerifier = codeVerifier;
    },
    codeVerifier: () => {
      if (!state.codeVerifier)
        throw new Error("Gojiberry PKCE verifier is unavailable");
      return state.codeVerifier;
    },
    validateResourceURL: async (_serverUrl, resource) =>
      validateOAuthResource(resource),
    saveDiscoveryState: discovery => {
      state.discoveryState = validateDiscovery(discovery);
    },
    discoveryState: () => state.discoveryState,
    invalidateCredentials: scope => {
      if (scope === "all" || scope === "client")
        state.clientInformation = undefined;
      if (scope === "all" || scope === "tokens") state.tokens = undefined;
      if (scope === "all" || scope === "verifier")
        state.codeVerifier = undefined;
      if (scope === "all" || scope === "discovery")
        state.discoveryState = undefined;
    },
  };
  return provider;
}

function parseOAuthConfig(value: unknown): GojiberryOAuthConfig {
  if (!isRecord(value)) throw new Error("Gojiberry integration is unavailable");
  const clientInformation = value.clientInformation;
  const tokens = value.tokens;
  const expiresAt = value.expiresAt;
  if (
    !isRecord(clientInformation) ||
    typeof clientInformation.client_id !== "string" ||
    !isRecord(tokens) ||
    typeof tokens.access_token !== "string" ||
    tokens.access_token.length === 0 ||
    typeof tokens.token_type !== "string" ||
    typeof expiresAt !== "number" ||
    !Number.isFinite(expiresAt)
  ) {
    throw new Error("Gojiberry integration is unavailable");
  }
  if (
    clientInformation.issuer !== undefined &&
    typeof clientInformation.issuer !== "string"
  ) {
    throw new Error("Gojiberry integration is unavailable");
  }
  if (
    tokens.refresh_token !== undefined &&
    typeof tokens.refresh_token !== "string"
  ) {
    throw new Error("Gojiberry integration is unavailable");
  }
  const rawDiscovery = value.discoveryState;
  if (rawDiscovery !== undefined && !isRecord(rawDiscovery))
    throw new Error("Gojiberry integration is unavailable");
  return {
    clientInformation: clientInformation as OAuthClientInformationMixed,
    tokens: tokens as OAuthTokens,
    expiresAt,
    discoveryState: rawDiscovery
      ? validateDiscovery(rawDiscovery as unknown as OAuthDiscoveryState)
      : undefined,
  };
}

function registeredRedirectUri(
  clientInformation: OAuthClientInformationMixed
): string {
  const redirectUris = (clientInformation as Record<string, unknown>)
    .redirect_uris;
  const first = Array.isArray(redirectUris) ? redirectUris[0] : undefined;
  if (typeof first !== "string" && !(first instanceof URL))
    throw new Error("Gojiberry integration is unavailable");
  let parsed: URL;
  try {
    parsed = new URL(String(first));
  } catch {
    throw new Error("Gojiberry integration is unavailable");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== GOJIBERRY_CALLBACK_PATH ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("Gojiberry integration is unavailable");
  }
  return parsed.toString();
}

function configForState(
  state: OAuthProviderState,
  previous?: GojiberryOAuthConfig
): GojiberryOAuthConfig {
  if (!state.clientInformation || !state.tokens) {
    throw new Error("Gojiberry authorization did not return credentials");
  }
  const expiresIn = state.tokens.expires_in;
  const expiresAt =
    typeof expiresIn === "number" && Number.isFinite(expiresIn) && expiresIn > 0
      ? Date.now() + expiresIn * 1000
      : (previous?.expiresAt ?? Date.now());
  return {
    clientInformation: state.clientInformation,
    tokens: state.tokens,
    expiresAt,
    discoveryState: state.discoveryState ?? previous?.discoveryState,
  };
}

function configReady(config: GojiberryOAuthConfig): boolean {
  return (
    config.expiresAt > Date.now() + AUTH_REFRESH_SKEW_MS ||
    (typeof config.tokens.refresh_token === "string" &&
      config.tokens.refresh_token.length > 0)
  );
}

async function ownerMembership(
  companyId: number,
  userId: number
): Promise<void> {
  assertCompanyId(companyId);
  assertUserId(userId);
  const database = await requiredDb();
  const rows = await database
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.companyId, companyId),
        eq(memberships.userId, userId),
        eq(memberships.role, "owner")
      )
    )
    .limit(1);
  if (!rows[0]) throw new Error("You do not have access to this company");
}

export async function startGojiberry(
  companyId: number,
  userId: number,
  origin: string
): Promise<{ url: string; state: string }> {
  await ownerMembership(companyId, userId);
  const trusted = await trustedOrigin(companyId, origin);
  const stateValue = randomBytes(32).toString("base64url");
  const redirectUri = `${trusted}${GOJIBERRY_CALLBACK_PATH}`;
  const providerState: OAuthProviderState = {};
  const provider = createOAuthProvider(redirectUri, providerState, stateValue);

  const result = await auth(provider, {
    serverUrl: GOJIBERRY_ENDPOINT,
    resourceMetadataUrl: new URL(GOJIBERRY_RESOURCE_METADATA_URL),
    scope: GOJIBERRY_SCOPE,
  });
  if (
    result !== "REDIRECT" ||
    !providerState.authorizationUrl ||
    !providerState.codeVerifier
  ) {
    throw new Error("Unable to start Gojiberry connection");
  }
  const authorizationUrl = new URL(providerState.authorizationUrl);
  if (
    authorizationUrl.origin !== EXPECTED_AUTH_SERVER ||
    authorizationUrl.pathname !== "/authorize" ||
    authorizationUrl.searchParams.get("state") !== stateValue ||
    authorizationUrl.searchParams.get("code_challenge_method") !== "S256" ||
    authorizationUrl.searchParams.get("scope") !== GOJIBERRY_SCOPE
  ) {
    throw new Error("Unable to start Gojiberry connection");
  }
  if (!providerState.clientInformation || !providerState.discoveryState) {
    throw new Error("Unable to start Gojiberry connection");
  }

  const payload: GojiberryOAuthSession = {
    state: stateValue,
    origin: trusted,
    redirectUri,
    codeVerifier: providerState.codeVerifier,
    clientInformation: providerState.clientInformation,
    discoveryState: providerState.discoveryState,
  };
  const database = await requiredDb();
  await database.insert(mcpOAuthSessions).values({
    companyId,
    userId,
    stateHash: sha256(stateValue),
    encryptedPayload: encryptConfig(
      payload,
      companyId,
      GOJIBERRY_SESSION_PROVIDER
    ),
    expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
  });
  return { url: authorizationUrl.toString(), state: stateValue };
}

/** Bind the short-lived OAuth state to the initiating browser. */
export function bindGojiberryStateCookie(
  res: Response,
  state: string,
  origin: string
): void {
  if (typeof state !== "string" || state.length < 32 || state.length > 4096)
    throw new Error("Invalid Gojiberry OAuth state");
  canonicalHttpsOrigin(origin);
  res.cookie(GOJIBERRY_STATE_COOKIE, state, cookieOptions());
}

async function saveOAuthConfig(
  companyId: number,
  config: GojiberryOAuthConfig
): Promise<void> {
  await saveIntegration(companyId, GOJIBERRY_PROVIDER, config, DISPLAY_NAME);
}

async function connectedOAuthState(companyId: number): Promise<{
  config: GojiberryOAuthConfig;
  state: OAuthProviderState;
  provider: OAuthClientProvider;
} | null> {
  const integration = await getIntegration<unknown>(
    companyId,
    GOJIBERRY_PROVIDER
  );
  if (!integration) return null;
  const config = parseOAuthConfig(integration.config);
  const state: OAuthProviderState = {
    clientInformation: config.clientInformation,
    tokens: config.tokens,
    discoveryState: config.discoveryState,
  };
  const provider = createOAuthProvider(
    registeredRedirectUri(config.clientInformation),
    state
  );
  if (config.expiresAt <= Date.now() + AUTH_REFRESH_SKEW_MS) {
    if (!config.tokens.refresh_token)
      throw new Error("Gojiberry authorization has expired");
    const result = await auth(provider, {
      serverUrl: GOJIBERRY_ENDPOINT,
      resourceMetadataUrl: new URL(GOJIBERRY_RESOURCE_METADATA_URL),
      scope: GOJIBERRY_SCOPE,
    });
    if (result !== "AUTHORIZED")
      throw new Error("Gojiberry authorization has expired");
    const refreshed = configForState(state, config);
    await saveOAuthConfig(companyId, refreshed);
    return { config: refreshed, state, provider };
  }
  return { config, state, provider };
}

export async function statusGojiberry(
  companyId: number
): Promise<GojiberryStatus> {
  assertCompanyId(companyId);
  try {
    const integration = await getIntegration<unknown>(
      companyId,
      GOJIBERRY_PROVIDER
    );
    if (!integration) return { connected: false, needsReconnect: false };
    const config = parseOAuthConfig(integration.config);
    return {
      connected: true,
      needsReconnect: !configReady(config),
      displayName: integration.row.displayName,
    };
  } catch {
    return { connected: false, needsReconnect: true };
  }
}

function unsafeToolText(tool: Tool): boolean {
  const text = `${tool.name} ${tool.description ?? ""}`.toLowerCase();
  // Nouns such as contact, lead, email, and campaign are common in read-only search
  // tools. Block actions and campaign/outreach mutations, not those nouns by themselves.
  return (
    /\b(send|sending|enroll|write|writing|create|creating|update|updating|delete|deleting|remove|removing|destroy|destroying|invite|inviting|publish|publishing|post|posting|schedule|scheduling|execute|executing|mutat|modify|modifying|edit|editing|add|adding|launch|launching|trigger|triggering)\b/.test(
      text
    ) ||
    /\b(campaign|outreach)\b[\s\S]*\b(send|create|update|delete|remove|publish|post|launch|trigger)\b/.test(
      text
    ) ||
    /\b(send|create|update|delete|remove|publish|post|launch|trigger)\b[\s\S]*\b(campaign|outreach)\b/.test(
      text
    )
  );
}

function safeReadOnlyTool(tool: Tool): boolean {
  return tool.annotations?.readOnlyHint === true && !unsafeToolText(tool);
}

function catalogueTool(tool: Tool): GojiberryTool {
  return {
    name: tool.name,
    ...(tool.title ? { title: tool.title } : {}),
    ...(tool.description ? { description: tool.description } : {}),
    inputSchema: (tool.inputSchema ?? {}) as Record<string, unknown>,
    ...(tool.outputSchema
      ? { outputSchema: tool.outputSchema as Record<string, unknown> }
      : {}),
    ...(tool.annotations ? { annotations: tool.annotations } : {}),
    safeReadOnly: safeReadOnlyTool(tool),
  };
}

async function withGojiberryClient<T>(
  companyId: number,
  operation: (client: Client) => Promise<T>
): Promise<T> {
  assertCompanyId(companyId);
  const connected = await connectedOAuthState(companyId);
  if (!connected) throw new Error("Gojiberry is not connected");
  const client = new Client({ name: "TailorPitch", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(
    new URL(GOJIBERRY_ENDPOINT),
    {
      authProvider: connected.provider,
    }
  );
  try {
    await client.connect(transport, {
      timeout: REQUEST_TIMEOUT_MS,
      maxTotalTimeout: REQUEST_TIMEOUT_MS,
    });
    return await operation(client);
  } finally {
    try {
      await client.close();
    } catch {
      // Do not expose provider or transport errors.
    }
    try {
      await transport.close();
    } catch {
      // Do not expose provider or transport errors.
    }
  }
}

async function fetchToolPages(client: Client): Promise<{
  tools: Tool[];
  pages: number;
  truncated: boolean;
}> {
  const tools: Tool[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  let pages = 0;
  let truncated = false;
  while (pages < MAX_TOOL_PAGES) {
    const page = await client.listTools(cursor ? { cursor } : undefined, {
      timeout: REQUEST_TIMEOUT_MS,
      maxTotalTimeout: REQUEST_TIMEOUT_MS,
    });
    pages += 1;
    tools.push(...page.tools);
    if (!page.nextCursor) break;
    if (seenCursors.has(page.nextCursor)) {
      truncated = true;
      break;
    }
    seenCursors.add(page.nextCursor);
    cursor = page.nextCursor;
  }
  if (cursor && pages >= MAX_TOOL_PAGES) truncated = true;
  return { tools, pages, truncated };
}

export async function listGojiberryTools(
  companyId: number
): Promise<GojiberryToolCatalogue> {
  const listed = await withGojiberryClient(companyId, fetchToolPages);
  return listed.tools.map(catalogueTool);
}

async function fullToolDefinition(client: Client, name: string): Promise<Tool> {
  if (typeof name !== "string" || name.length < 1 || name.length > 255)
    throw new Error("Invalid Gojiberry tool");
  const listed = await fetchToolPages(client);
  const tool = listed.tools.find(candidate => candidate.name === name);
  if (!tool || !safeReadOnlyTool(tool))
    throw new Error("Gojiberry tool is not an approved read-only tool");
  return tool;
}

function validatedArguments(
  tool: Tool,
  args: unknown
): Record<string, unknown> {
  const value = args === undefined ? {} : args;
  if (!isRecord(value))
    throw new Error("Gojiberry tool arguments must be an object");
  const schema = tool.inputSchema as Record<string, unknown>;
  let valid = false;
  try {
    valid = Boolean(ajv.validate(schema, value));
  } catch {
    valid = false;
  }
  if (!valid) throw new Error("Gojiberry tool arguments are invalid");
  return value;
}

function boundedResult<T>(result: T): T {
  let serialized: string;
  try {
    serialized = JSON.stringify(result);
  } catch {
    throw new Error("Gojiberry returned an unreadable result");
  }
  if (Buffer.byteLength(serialized, "utf8") > MAX_TOOL_RESULT_BYTES)
    throw new Error("Gojiberry result is too large");
  return result;
}

export async function callGojiberryReadOnly(
  companyId: number,
  selection: ToolCallSelection | string,
  args?: unknown
): Promise<unknown> {
  const request: ToolCallSelection =
    typeof selection === "string" ? { name: selection, args } : selection;
  if (!isRecord(request) || typeof request.name !== "string")
    throw new Error("Invalid Gojiberry tool request");
  return withGojiberryClient(companyId, async client => {
    const tool = await fullToolDefinition(client, request.name);
    const argumentsValue = validatedArguments(tool, request.args);
    const result = await client.callTool(
      { name: tool.name, arguments: argumentsValue },
      undefined,
      { timeout: REQUEST_TIMEOUT_MS, maxTotalTimeout: REQUEST_TIMEOUT_MS }
    );
    if ((result as { isError?: boolean }).isError)
      throw new Error(
        "Gojiberry reported a tool error. No result was imported."
      );
    return boundedResult(result);
  });
}

export async function testGojiberry(
  companyId: number,
  selection: ToolCallSelection
): Promise<{ name: string; safeReadOnly: true; result: unknown }> {
  if (!isRecord(selection) || typeof selection.name !== "string")
    throw new Error("Invalid Gojiberry tool request");
  const result = await callGojiberryReadOnly(companyId, selection);
  return { name: selection.name, safeReadOnly: true, result };
}

export async function disconnectGojiberry(companyId: number): Promise<void> {
  assertCompanyId(companyId);
  const database = await requiredDb();
  await database
    .delete(integrations)
    .where(
      and(
        eq(integrations.companyId, companyId),
        eq(integrations.provider, GOJIBERRY_PROVIDER)
      )
    );
  await database
    .delete(mcpOAuthSessions)
    .where(eq(mcpOAuthSessions.companyId, companyId));
}

async function completeGojiberryCallback(
  req: Request,
  res: Response
): Promise<void> {
  let redirectOrigin: string | null = null;
  try {
    const user = await sdk.authenticateRequest(req);
    const state = oneQueryValue(req.query.state);
    const code = oneQueryValue(req.query.code);
    const cookieState = parseCookie(req.headers.cookie ?? "")[
      GOJIBERRY_STATE_COOKIE
    ];
    if (!state || !code || !cookieState || !sameSecret(state, cookieState))
      throw new Error("Invalid Gojiberry OAuth state");

    const database = await requiredDb();
    const rows = await database
      .select()
      .from(mcpOAuthSessions)
      .where(
        and(
          eq(mcpOAuthSessions.stateHash, sha256(state)),
          isNull(mcpOAuthSessions.consumedAt),
          gt(mcpOAuthSessions.expiresAt, new Date())
        )
      )
      .limit(1);
    const sessionRow = rows[0];
    if (!sessionRow || sessionRow.userId !== user.id)
      throw new Error("Invalid Gojiberry OAuth state");

    const payload = decryptConfig<GojiberryOAuthSession>(
      sessionRow.encryptedPayload,
      sessionRow.companyId,
      GOJIBERRY_SESSION_PROVIDER
    );
    if (
      payload.state !== state ||
      payload.redirectUri !== `${payload.origin}${GOJIBERRY_CALLBACK_PATH}`
    ) {
      throw new Error("Invalid Gojiberry OAuth state");
    }
    redirectOrigin = await trustedOrigin(sessionRow.companyId, payload.origin);
    await ownerMembership(sessionRow.companyId, user.id);

    const [consumed] = await database
      .update(mcpOAuthSessions)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(mcpOAuthSessions.id, sessionRow.id),
          isNull(mcpOAuthSessions.consumedAt)
        )
      );
    if (Number((consumed as { affectedRows?: number }).affectedRows ?? 0) !== 1)
      throw new Error("Invalid Gojiberry OAuth state");

    const providerState: OAuthProviderState = {
      clientInformation: payload.clientInformation,
      discoveryState: payload.discoveryState,
      codeVerifier: payload.codeVerifier,
    };
    const provider = createOAuthProvider(
      payload.redirectUri,
      providerState,
      state
    );
    const result = await auth(provider, {
      serverUrl: GOJIBERRY_ENDPOINT,
      resourceMetadataUrl: new URL(GOJIBERRY_RESOURCE_METADATA_URL),
      scope: GOJIBERRY_SCOPE,
      authorizationCode: code,
    });
    if (result !== "AUTHORIZED")
      throw new Error("Gojiberry authorization failed");
    const config = configForState(providerState);
    await saveOAuthConfig(sessionRow.companyId, config);

    res.clearCookie(GOJIBERRY_STATE_COOKIE, {
      ...cookieOptions(),
      maxAge: undefined,
    });
    res.redirect(`${redirectOrigin}/app/settings?gojiberry=connected`);
  } catch {
    res.clearCookie(GOJIBERRY_STATE_COOKIE, {
      ...cookieOptions(),
      maxAge: undefined,
    });
    if (redirectOrigin) {
      res.redirect(`${redirectOrigin}/app/settings?gojiberry=failed`);
    } else {
      res
        .status(400)
        .json({ error: "Unable to complete Gojiberry connection" });
    }
  }
}

export function registerGojiberryRoutes(app: Express): void {
  app.get(GOJIBERRY_CALLBACK_PATH, async (req, res) => {
    await completeGojiberryCallback(req, res);
  });
}

function cryptoRandomBytes(size: number): Uint8Array {
  // Kept as a tiny indirection to make protocol tests able to replace randomness without
  // touching OAuth or database state. The implementation uses the platform CSPRNG.
  const bytes = new Uint8Array(size);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}
