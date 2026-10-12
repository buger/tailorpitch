import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { Express, Request, Response } from "express";
import { parse as parseCookie } from "cookie";
import { and, eq, gt, isNull } from "drizzle-orm";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import { z } from "zod";
import {
  inboxMessages,
  integrations,
  memberships,
  oauthStates,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { sdk } from "../_core/sdk";
import { getIntegration, saveIntegration } from "./credentials";

export const GMAIL_CALLBACK_PATH = "/api/mailbox/gmail/callback";
const GMAIL_START_PATH = "/api/mailbox/gmail/start";
const GMAIL_STATE_COOKIE = "leadloom_gmail_oauth_state";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const NETWORK_TIMEOUT_MS = 15_000;
const IMAP_SOURCE_LIMIT = 100 * 1024;
const IMAP_SNIPPET_LIMIT = 3_000;

const gmailConfigSchema = z.object({
  refreshToken: z.string().min(1).max(4096),
  accessToken: z.string().min(1).max(4096),
  expiresAt: z.number().finite().positive(),
  email: z.string().email().max(320),
});

type GmailConfig = z.infer<typeof gmailConfigSchema>;

type ImapConfig = {
  email: string;
  username: string;
  password: string;
  imapHost: string;
  imapPort: 993;
  imapSecure: true;
  smtpHost: string;
  smtpPort: 465 | 587;
  smtpSecure: boolean;
};

const imapInputSchema = z
  .object({
    email: z.string().email().max(320),
    username: z.string().min(1).max(320),
    password: z.string().min(1).max(1024),
    imapHost: z.string().min(1).max(253),
    imapPort: z.coerce.number().int(),
    imapSecure: z.boolean(),
    smtpHost: z.string().min(1).max(253),
    smtpPort: z.coerce.number().int(),
    smtpSecure: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.imapPort !== 993 || value.imapSecure !== true) {
      ctx.addIssue({
        code: "custom",
        path: ["imapPort"],
        message: "IMAP must use TLS on port 993",
      });
    }
    if (value.smtpPort === 465 && value.smtpSecure !== true) {
      ctx.addIssue({
        code: "custom",
        path: ["smtpSecure"],
        message: "SMTP port 465 requires TLS",
      });
    }
    if (value.smtpPort === 587 && value.smtpSecure !== false) {
      ctx.addIssue({
        code: "custom",
        path: ["smtpSecure"],
        message: "SMTP port 587 requires STARTTLS",
      });
    }
    if (value.smtpPort !== 465 && value.smtpPort !== 587) {
      ctx.addIssue({
        code: "custom",
        path: ["smtpPort"],
        message: "SMTP must use port 465 or 587",
      });
    }
  });

const sendInputSchema = z.object({
  to: z.string().email().max(320),
  subject: z.string().min(1).max(240),
  body: z.string().min(1).max(100_000),
  messageKey: z.string().min(1).max(255),
  unsubscribeUrl: z
    .string()
    .url()
    .max(2000)
    .refine(value => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" && !url.username && !url.password;
      } catch {
        return false;
      }
    }, "Unsubscribe URL must be HTTPS without credentials"),
});

type SendInput = z.infer<typeof sendInputSchema>;

function requiredDb() {
  return getDb().then(database => {
    if (!database) throw new Error("Database is not available");
    return database;
  });
}

function safeExternalError(message: string): Error {
  return new Error(message);
}

function hasHeaderInjection(value: string): boolean {
  return /[\r\n]/.test(value);
}

function assertSafeHeader(value: string, label: string): void {
  if (hasHeaderInjection(value))
    throw new Error(`${label} contains invalid characters`);
}

function assertPrivateOrReservedAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const octets = address.split(".").map(Number);
    const [a, b] = octets;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 2)) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0) ||
      a >= 224
    );
  }
  if (version === 6) {
    let lower = address.toLowerCase();
    if (lower.includes(".")) {
      const lastColon = lower.lastIndexOf(":");
      const ipv4 = lower
        .slice(lastColon + 1)
        .split(".")
        .map(Number);
      if (
        ipv4.length !== 4 ||
        ipv4.some(part => !Number.isInteger(part) || part < 0 || part > 255)
      )
        return true;
      const high = ((ipv4[0] << 8) | ipv4[1]).toString(16);
      const low = ((ipv4[2] << 8) | ipv4[3]).toString(16);
      lower = `${lower.slice(0, lastColon + 1)}${high}:${low}`;
    }
    if (lower === "::" || lower === "::1" || lower.startsWith("ff"))
      return true;
    const parts = lower.split("::");
    const left = parts[0] ? parts[0].split(":") : [];
    const right = parts[1] ? parts[1].split(":") : [];
    const missing = 8 - left.length - right.length;
    const expanded = [
      ...left,
      ...Array(Math.max(0, missing)).fill("0"),
      ...right,
    ].map(part => parseInt(part || "0", 16));
    const first = expanded[0] ?? 0;
    const second = expanded[1] ?? 0;
    if (!expanded.every(Number.isFinite) || expanded.length !== 8) return true;
    if ((first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80) return true;
    if (first === 0x2001 && second === 0x0db8) return true; // documentation range
    if (first === 0x0100 && second === 0) return true; // discard-only range
    if (first === 0x2001 && (second === 0x0002 || (second & 0xfff0) === 0x0010))
      return true;
    if (
      first === 0x2001 &&
      second === 0x0000 &&
      expanded[2] === 0 &&
      expanded[3] === 0
    )
      return true;
    if ((first === 0 && second === 0) || (first === 0 && second === 0xffff))
      return true;
    return false;
  }
  return true;
}

function cleanHost(host: string): string {
  const value = host
    .trim()
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
  if (
    !value ||
    value.length > 253 ||
    /[\\/@?#\s]/.test(value) ||
    value === "localhost" ||
    value.endsWith(".local")
  ) {
    throw new Error("Mailbox host is invalid");
  }
  if (
    !isIP(value) &&
    (!value.includes(".") ||
      value
        .split(".")
        .some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)))
  ) {
    throw new Error("Mailbox host is invalid");
  }
  return value;
}

async function withTimeout<T>(
  promise: Promise<T>,
  message: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(message)),
          NETWORK_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function assertPublicDnsHost(host: string): Promise<string> {
  const clean = cleanHost(host);
  try {
    if (isIP(clean)) {
      if (assertPrivateOrReservedAddress(clean))
        throw new Error("reserved address");
      return clean;
    }
    const addresses = await withTimeout(
      lookup(clean, { all: true, verbatim: true }),
      "DNS lookup timed out"
    );
    if (
      !addresses.length ||
      addresses.some(address => assertPrivateOrReservedAddress(address.address))
    ) {
      throw new Error("reserved address");
    }
    return clean;
  } catch {
    throw safeExternalError("Mailbox host could not be validated");
  }
}

function assertSafeOrigin(origin: string): string {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error("Gmail origin must be a valid HTTPS origin");
  }
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const unsafeHostname =
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    (isIP(hostname) !== 0 && assertPrivateOrReservedAddress(hostname));
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    parsed.port ||
    unsafeHostname
  ) {
    throw new Error(
      "Gmail origin must be a public HTTPS origin without a path"
    );
  }
  return parsed.origin;
}

type GoogleClient = { id: string; secret: string };

const googleClientConfigSchema = z.object({
  clientId: z.string().min(1).max(1000),
  clientSecret: z.string().min(1).max(1000),
});

async function getGoogleClient(companyId: number): Promise<GoogleClient> {
  const configured = await getIntegration<unknown>(companyId, "google-client");
  if (configured) {
    const parsed = googleClientConfigSchema.safeParse(configured.config);
    if (!parsed.success)
      throw new Error("Gmail OAuth client configuration is invalid");
    return { id: parsed.data.clientId, secret: parsed.data.clientSecret };
  }
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret)
    throw new Error(
      "Gmail OAuth is not configured: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required"
    );
  return { id, secret };
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function sameHash(left: string, right: string): boolean {
  const a = sha256(left);
  const b = sha256(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    path: GMAIL_CALLBACK_PATH,
    maxAge: OAUTH_STATE_TTL_MS,
  };
}

function singleQueryValue(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0 && value.length <= 4096)
    return value;
  return null;
}

function gmailAuthorizationUrl(
  state: string,
  redirectUri: string,
  client: GoogleClient
): string {
  const query = new URLSearchParams({
    client_id: client.id,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope:
      "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`;
}

async function jsonResponse(
  response: globalThis.Response
): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await response.json();
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

async function exchangeGoogleCode(
  code: string,
  redirectUri: string,
  client: GoogleClient
): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  let response: globalThis.Response;
  try {
    response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: client.id,
        client_secret: client.secret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
    });
  } catch {
    throw safeExternalError("Gmail authorization could not be completed");
  }
  const payload = await jsonResponse(response);
  const accessToken =
    typeof payload.access_token === "string" ? payload.access_token : "";
  const refreshToken =
    typeof payload.refresh_token === "string" &&
    payload.refresh_token.length > 0
      ? payload.refresh_token
      : undefined;
  const expiresIn =
    typeof payload.expires_in === "number" &&
    Number.isFinite(payload.expires_in)
      ? payload.expires_in
      : 0;
  if (!response.ok || !accessToken || expiresIn <= 0 || expiresIn > 86_400) {
    throw safeExternalError("Gmail authorization could not be completed");
  }
  return { accessToken, refreshToken, expiresIn };
}

async function fetchGmailProfile(accessToken: string): Promise<string> {
  let response: globalThis.Response;
  try {
    response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      {
        headers: { authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
      }
    );
  } catch {
    throw safeExternalError("Gmail account could not be verified");
  }
  const payload = await jsonResponse(response);
  const email =
    typeof payload.emailAddress === "string" ? payload.emailAddress : "";
  if (!response.ok || !z.string().email().safeParse(email).success) {
    throw safeExternalError("Gmail account could not be verified");
  }
  return email.toLowerCase();
}

async function refreshGmailToken(
  config: GmailConfig,
  client: GoogleClient
): Promise<GmailConfig> {
  if (config.expiresAt > Date.now() + 60_000) return config;
  let response: globalThis.Response;
  try {
    response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: client.id,
        client_secret: client.secret,
        refresh_token: config.refreshToken,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
    });
  } catch {
    throw safeExternalError("Gmail authorization has expired");
  }
  const payload = await jsonResponse(response);
  const accessToken =
    typeof payload.access_token === "string" ? payload.access_token : "";
  const expiresIn =
    typeof payload.expires_in === "number" &&
    Number.isFinite(payload.expires_in)
      ? payload.expires_in
      : 0;
  if (!response.ok || !accessToken || expiresIn <= 0 || expiresIn > 86_400) {
    throw safeExternalError("Gmail authorization has expired");
  }
  return { ...config, accessToken, expiresAt: Date.now() + expiresIn * 1000 };
}

async function gmailConfigFor(companyId: number): Promise<GmailConfig | null> {
  const integration = await getIntegration<unknown>(companyId, "gmail");
  if (!integration) return null;
  const parsed = gmailConfigSchema.safeParse(integration.config);
  if (!parsed.success)
    throw safeExternalError("Gmail integration is unavailable");
  const client = await getGoogleClient(companyId);
  const refreshed = await refreshGmailToken(parsed.data, client);
  if (refreshed.accessToken !== parsed.data.accessToken) {
    await saveIntegration(companyId, "gmail", refreshed, refreshed.email);
  }
  return refreshed;
}

function imapConfigFor(value: unknown): ImapConfig {
  const parsed = z
    .object({
      email: z.string().email().max(320),
      username: z.string().min(1).max(320),
      password: z.string().min(1).max(1024),
      imapHost: z.string().min(1).max(253),
      imapPort: z.literal(993),
      imapSecure: z.literal(true),
      smtpHost: z.string().min(1).max(253),
      smtpPort: z.union([z.literal(465), z.literal(587)]),
      smtpSecure: z.boolean(),
    })
    .superRefine((config, ctx) => {
      if ((config.smtpPort === 465) !== config.smtpSecure) {
        ctx.addIssue({
          code: "custom",
          path: ["smtpSecure"],
          message: "SMTP security does not match the port",
        });
      }
    })
    .safeParse(value);
  if (!parsed.success)
    throw safeExternalError("IMAP integration is unavailable");
  return parsed.data;
}

function smtpTransport(config: ImapConfig) {
  const options: SMTPTransport.Options = {
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    requireTLS: config.smtpPort === 587,
    auth: { user: config.username, pass: config.password },
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    connectionTimeout: NETWORK_TIMEOUT_MS,
    greetingTimeout: NETWORK_TIMEOUT_MS,
    socketTimeout: 30_000,
  };
  return nodemailer.createTransport(options);
}

async function connectImapClient(config: ImapConfig): Promise<ImapFlow> {
  const client = new ImapFlow({
    logger: false,
    host: config.imapHost,
    port: 993,
    secure: true,
    auth: { user: config.username, pass: config.password },
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    connectionTimeout: NETWORK_TIMEOUT_MS,
    greetingTimeout: NETWORK_TIMEOUT_MS,
    socketTimeout: 30_000,
  });
  try {
    await client.connect();
    return client;
  } catch {
    try {
      client.close();
    } catch {
      /* no credential-bearing error */
    }
    throw safeExternalError("Mailbox login failed");
  }
}

async function closeImap(client: ImapFlow | null): Promise<void> {
  if (!client) return;
  try {
    await client.logout();
  } catch {
    try {
      client.close();
    } catch {
      /* no credential-bearing error */
    }
  }
}

function truncateSnippet(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, IMAP_SNIPPET_LIMIT);
}

function validReceivedAt(value: unknown): Date {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

async function upsertInbox(
  companyId: number,
  provider: "gmail" | "imap",
  externalId: string,
  from: string,
  subject: string,
  snippet: string,
  receivedAt: Date
): Promise<void> {
  const database = await requiredDb();
  await database
    .insert(inboxMessages)
    .values({
      companyId,
      provider,
      externalId: externalId.slice(0, 255),
      from: from.slice(0, 500),
      subject: subject.slice(0, 500),
      snippet,
      receivedAt,
    })
    .onDuplicateKeyUpdate({
      set: {
        from: from.slice(0, 500),
        subject: subject.slice(0, 500),
        snippet,
        receivedAt,
      },
    });
}

function headerValue(
  headers: Array<{ name?: string; value?: string }> | undefined,
  name: string
): string {
  const header = headers?.find(
    item => item.name?.toLowerCase() === name.toLowerCase()
  );
  return typeof header?.value === "string" ? header.value : "";
}

async function syncGmail(
  companyId: number,
  config: GmailConfig
): Promise<number> {
  let listResponse: globalThis.Response;
  try {
    listResponse = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?" +
        new URLSearchParams({
          q: "in:inbox",
          maxResults: "20",
          labelIds: "INBOX",
        }),
      {
        headers: { authorization: `Bearer ${config.accessToken}` },
        signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
      }
    );
  } catch {
    throw safeExternalError("Gmail inbox could not be read");
  }
  const listed = await jsonResponse(listResponse);
  if (!listResponse.ok)
    throw safeExternalError("Gmail inbox could not be read");
  const messages = Array.isArray(listed.messages) ? listed.messages : [];
  let count = 0;
  for (const item of messages.slice(0, 20)) {
    const id =
      item &&
      typeof item === "object" &&
      typeof (item as { id?: unknown }).id === "string"
        ? (item as { id: string }).id
        : "";
    if (!id) continue;
    let response: globalThis.Response;
    try {
      response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        {
          headers: { authorization: `Bearer ${config.accessToken}` },
          signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
        }
      );
    } catch {
      continue;
    }
    if (!response.ok) continue;
    const message = await jsonResponse(response);
    const payload =
      message.payload && typeof message.payload === "object"
        ? (message.payload as {
            headers?: Array<{ name?: string; value?: string }>;
          })
        : {};
    const from = headerValue(payload.headers, "From") || "Unknown sender";
    const subject = headerValue(payload.headers, "Subject") || "(no subject)";
    const dateHeader = headerValue(payload.headers, "Date");
    const snippet =
      typeof message.snippet === "string"
        ? truncateSnippet(message.snippet)
        : "";
    await upsertInbox(
      companyId,
      "gmail",
      id,
      from,
      subject,
      snippet,
      validReceivedAt(dateHeader)
    );
    count += 1;
  }
  return count;
}

function imapEnvelopeFrom(
  envelope: { from?: Array<{ name?: string; address?: string }> } | undefined
): string {
  const sender = envelope?.from?.[0];
  if (!sender) return "Unknown sender";
  if (sender.address && sender.name)
    return `${sender.name} <${sender.address}>`;
  return sender.address || sender.name || "Unknown sender";
}

async function syncImap(
  companyId: number,
  config: ImapConfig
): Promise<number> {
  const client = await connectImapClient(config);
  let count = 0;
  try {
    await client.mailboxOpen("INBOX", { readOnly: true });
    const lock = await client.getMailboxLock("INBOX");
    try {
      const mailboxState = client.mailbox;
      const exists =
        mailboxState && typeof mailboxState === "object"
          ? mailboxState.exists
          : 0;
      const uidValidity =
        mailboxState && typeof mailboxState === "object"
          ? String(
              (mailboxState as { uidValidity?: string | number | bigint })
                .uidValidity ?? "unknown"
            )
          : "unknown";
      if (exists <= 0) return 0;
      const start = Math.max(1, exists - 19);
      const summaries: Array<{
        uid: number;
        size?: number;
        envelope?: {
          from?: Array<{ name?: string; address?: string }>;
          subject?: string;
          date?: Date;
        };
      }> = [];
      for await (const message of client.fetch(`${start}:*`, {
        uid: true,
        size: true,
        envelope: true,
      })) {
        if (typeof message.uid === "number")
          summaries.push(message as (typeof summaries)[number]);
      }
      for (const summary of summaries.slice(-20)) {
        let from = imapEnvelopeFrom(summary.envelope);
        let subject = summary.envelope?.subject || "(no subject)";
        let snippet = "";
        if ((summary.size ?? IMAP_SOURCE_LIMIT + 1) <= IMAP_SOURCE_LIMIT) {
          try {
            const full = await client.fetchOne(
              summary.uid,
              { uid: true, source: true },
              { uid: true }
            );
            const source =
              full && typeof full === "object" ? full.source : undefined;
            if (source) {
              const parsed = await simpleParser(source);
              from = parsed.from?.text || from;
              subject = parsed.subject || subject;
              snippet = truncateSnippet(parsed.text || "");
            }
          } catch {
            // Keep envelope metadata when a bounded source cannot be parsed.
          }
        }
        await upsertInbox(
          companyId,
          "imap",
          `${uidValidity}:${summary.uid}`,
          from,
          subject,
          snippet,
          validReceivedAt(summary.envelope?.date)
        );
        count += 1;
      }
    } finally {
      lock.release();
    }
  } catch {
    throw safeExternalError("Mailbox inbox could not be read");
  } finally {
    await closeImap(client);
  }
  return count;
}

export async function getMailboxStatus(companyId: number): Promise<{
  apify: { connected: boolean; displayName?: string };
  mailbox: {
    connected: boolean;
    provider?: "gmail" | "imap";
    displayName?: string;
  };
  gmailAvailable: boolean;
  gmailCallbackPath: "/api/mailbox/gmail/callback";
}> {
  const [apify, gmail, imap, googleClient] = await Promise.all([
    getIntegration<unknown>(companyId, "apify"),
    getIntegration<unknown>(companyId, "gmail"),
    getIntegration<unknown>(companyId, "imap"),
    getIntegration<unknown>(companyId, "google-client"),
  ]);
  const mailbox = gmail
    ? {
        connected: true as const,
        provider: "gmail" as const,
        displayName: gmail.row.displayName,
      }
    : imap
      ? {
          connected: true as const,
          provider: "imap" as const,
          displayName: imap.row.displayName,
        }
      : { connected: false as const };
  return {
    apify: apify
      ? { connected: true, displayName: apify.row.displayName }
      : { connected: false },
    mailbox,
    gmailAvailable: Boolean(
      googleClient ||
        (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    ),
    gmailCallbackPath: GMAIL_CALLBACK_PATH,
  };
}

export async function connectImap(
  companyId: number,
  input: unknown
): Promise<{ provider: "imap"; displayName: string }> {
  const parsed = imapInputSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid mailbox settings");
  const imapHost = await assertPublicDnsHost(parsed.data.imapHost);
  const smtpHost = await assertPublicDnsHost(parsed.data.smtpHost);
  const config: ImapConfig = {
    ...parsed.data,
    imapHost,
    smtpHost,
    imapPort: 993,
    imapSecure: true,
    smtpPort: parsed.data.smtpPort as 465 | 587,
    smtpSecure: parsed.data.smtpSecure,
  };

  let client: ImapFlow | null = null;
  const transporter = smtpTransport(config);
  try {
    client = await connectImapClient(config);
    await client.mailboxOpen("INBOX", { readOnly: true });
    await transporter.verify();
  } catch {
    throw safeExternalError(
      "Mailbox connection failed; check the settings and credentials"
    );
  } finally {
    await closeImap(client);
    try {
      transporter.close();
    } catch {
      /* no credential-bearing error */
    }
  }

  await saveIntegration(companyId, "imap", config, config.email);
  return { provider: "imap", displayName: config.email };
}

export async function disconnectIntegration(
  companyId: number,
  provider: "apify" | "gmail" | "imap"
): Promise<void> {
  if (provider !== "apify" && provider !== "gmail" && provider !== "imap")
    throw new Error("Invalid integration provider");
  const database = await requiredDb();
  await database
    .delete(integrations)
    .where(
      and(
        eq(integrations.companyId, companyId),
        eq(integrations.provider, provider)
      )
    );
}

export async function startGmail(
  userId: number,
  companyId: number,
  origin: string
): Promise<{ url: string }> {
  const redirectOrigin = assertSafeOrigin(origin);
  const googleClient = await getGoogleClient(companyId);
  const database = await requiredDb();
  const membership = await database
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.companyId, companyId),
        eq(memberships.userId, userId),
        eq(memberships.role, "owner")
      )
    )
    .limit(1);
  if (!membership[0]) throw new Error("You do not have access to this company");

  const state = randomBytes(32).toString("base64url");
  const redirectUri = `${redirectOrigin}${GMAIL_CALLBACK_PATH}`;
  await database.insert(oauthStates).values({
    companyId,
    userId,
    stateHash: sha256(state).toString("hex"),
    redirectUri,
    expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
  });
  return { url: gmailAuthorizationUrl(state, redirectUri, googleClient) };
}

/** Bind the short-lived OAuth state to the initiating browser before navigation to Google. */
export function bindGmailStateCookie(res: Response, url: string): void {
  const state = new URL(url).searchParams.get("state");
  if (!state || state.length > 4096) throw new Error("Invalid Gmail OAuth URL");
  res.cookie(GMAIL_STATE_COOKIE, state, cookieOptions());
}

async function completeGmailCallback(
  req: Request,
  res: Response
): Promise<void> {
  let redirectOrigin: string | null = null;
  try {
    const user = await sdk.authenticateRequest(req);
    const state = singleQueryValue(req.query.state);
    const code = singleQueryValue(req.query.code);
    const cookieState = parseCookie(req.headers.cookie || "")[
      GMAIL_STATE_COOKIE
    ];
    if (!state || !code || !cookieState || !sameHash(state, cookieState))
      throw new Error("Invalid Gmail OAuth state");

    const database = await requiredDb();
    const rows = await database
      .select()
      .from(oauthStates)
      .where(
        and(
          eq(oauthStates.stateHash, sha256(state).toString("hex")),
          isNull(oauthStates.consumedAt),
          gt(oauthStates.expiresAt, new Date())
        )
      )
      .limit(1);
    const stateRow = rows[0];
    if (!stateRow || stateRow.userId !== user.id)
      throw new Error("Invalid Gmail OAuth state");
    redirectOrigin = new URL(stateRow.redirectUri).origin;
    const member = await database
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.companyId, stateRow.companyId),
          eq(memberships.userId, user.id),
          eq(memberships.role, "owner")
        )
      )
      .limit(1);
    if (!member[0]) throw new Error("Invalid Gmail OAuth membership");

    const [consumed] = await database
      .update(oauthStates)
      .set({ consumedAt: new Date() })
      .where(
        and(eq(oauthStates.id, stateRow.id), isNull(oauthStates.consumedAt))
      );
    if (Number((consumed as { affectedRows?: number }).affectedRows ?? 0) !== 1)
      throw new Error("Invalid Gmail OAuth state");

    const googleClient = await getGoogleClient(stateRow.companyId);
    const tokens = await exchangeGoogleCode(
      code,
      stateRow.redirectUri,
      googleClient
    );
    const email = await fetchGmailProfile(tokens.accessToken);
    const existing = await getIntegration<unknown>(stateRow.companyId, "gmail");
    const existingConfig = existing
      ? gmailConfigSchema.safeParse(existing.config)
      : null;
    const refreshToken =
      tokens.refreshToken ||
      (existingConfig?.success ? existingConfig.data.refreshToken : "");
    if (!refreshToken)
      throw safeExternalError("Gmail did not grant offline access");
    const config: GmailConfig = {
      refreshToken,
      accessToken: tokens.accessToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
      email,
    };
    await saveIntegration(stateRow.companyId, "gmail", config, email);
    res.clearCookie(GMAIL_STATE_COOKIE, {
      ...cookieOptions(),
      maxAge: undefined,
    });
    res.redirect(`${redirectOrigin}/app/settings?gmail=connected`);
  } catch {
    res.clearCookie(GMAIL_STATE_COOKIE, {
      ...cookieOptions(),
      maxAge: undefined,
    });
    if (redirectOrigin) {
      res.redirect(`${redirectOrigin}/app/settings?gmail=error`);
    } else {
      res.status(400).json({ error: "Gmail connection failed" });
    }
  }
}

function gmailRawMessage(info: { message?: Buffer | string }): string {
  const value = info.message;
  if (!value) throw safeExternalError("Email could not be prepared");
  return (Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8")).toString(
    "base64url"
  );
}

async function sendGmail(
  companyId: number,
  config: GmailConfig,
  input: SendInput
): Promise<{ providerId: string; provider: "gmail" }> {
  assertSafeHeader(input.to, "Recipient");
  assertSafeHeader(input.subject, "Subject");
  assertSafeHeader(input.messageKey, "Message key");
  const transport = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: "unix",
  });
  const info = await transport.sendMail({
    from: config.email,
    to: input.to,
    subject: input.subject,
    text: input.body,
    headers: {
      "List-Unsubscribe": `<${input.unsubscribeUrl}>`,
      "X-Leadloom-Message-Key": input.messageKey,
    },
  });
  const raw = gmailRawMessage(info as { message?: Buffer | string });
  let response: globalThis.Response;
  try {
    response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ raw }),
        signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
      }
    );
  } catch {
    throw safeExternalError("Gmail could not send the message");
  }
  const payload = await jsonResponse(response);
  const providerId = typeof payload.id === "string" ? payload.id : "";
  if (!response.ok || !providerId)
    throw safeExternalError("Gmail could not send the message");
  return { providerId, provider: "gmail" };
}

async function sendSmtp(
  config: ImapConfig,
  input: SendInput
): Promise<{ providerId: string; provider: "imap" }> {
  assertSafeHeader(input.to, "Recipient");
  assertSafeHeader(input.subject, "Subject");
  assertSafeHeader(input.messageKey, "Message key");
  const transport = smtpTransport(config);
  try {
    const info = await transport.sendMail({
      from: config.email,
      to: input.to,
      subject: input.subject,
      text: input.body,
      headers: {
        "List-Unsubscribe": `<${input.unsubscribeUrl}>`,
        "X-Leadloom-Message-Key": input.messageKey,
      },
    });
    const recipientAccepted =
      Array.isArray(info.accepted) &&
      info.accepted.some(
        value =>
          typeof value === "string" &&
          value.toLowerCase() === input.to.toLowerCase()
      );
    const recipientRejected =
      Array.isArray(info.rejected) && info.rejected.length > 0;
    if (!recipientAccepted || recipientRejected)
      throw safeExternalError("SMTP did not accept the message");
    const providerId =
      typeof info.messageId === "string" && info.messageId.length > 0
        ? info.messageId
        : String(info.response || "accepted");
    return { providerId: providerId.slice(0, 255), provider: "imap" };
  } finally {
    try {
      transport.close();
    } catch {
      /* no credential-bearing error */
    }
  }
}

export async function sendMailbox(
  companyId: number,
  input: SendInput
): Promise<{ providerId: string; provider: "gmail" | "imap" }> {
  const parsed = sendInputSchema.safeParse(input);
  if (
    !parsed.success ||
    hasHeaderInjection(parsed.data?.subject ?? "") ||
    hasHeaderInjection(parsed.data?.messageKey ?? "")
  ) {
    throw new Error("Invalid email message");
  }
  const gmail = await gmailConfigFor(companyId);
  if (gmail) return sendGmail(companyId, gmail, parsed.data);
  const imapIntegration = await getIntegration<unknown>(companyId, "imap");
  if (!imapIntegration) throw new Error("No mailbox is connected");
  return sendSmtp(imapConfigFor(imapIntegration.config), parsed.data);
}

export async function syncInbox(companyId: number): Promise<{ count: number }> {
  const gmail = await gmailConfigFor(companyId);
  if (gmail) return { count: await syncGmail(companyId, gmail) };
  const imapIntegration = await getIntegration<unknown>(companyId, "imap");
  if (!imapIntegration) throw new Error("No mailbox is connected");
  return {
    count: await syncImap(companyId, imapConfigFor(imapIntegration.config)),
  };
}

function safeRedirectOrigin(value: string): string | null {
  try {
    const origin = new URL(value);
    const hostname = origin.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const unsafeHostname =
      hostname === "localhost" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      (isIP(hostname) !== 0 && assertPrivateOrReservedAddress(hostname));
    if (
      origin.protocol !== "https:" ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash ||
      origin.port ||
      unsafeHostname
    )
      return null;
    return origin.origin;
  } catch {
    return null;
  }
}

export function registerMailboxRoutes(app: Express): void {
  app.get(GMAIL_START_PATH, async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const companyIdRaw = singleQueryValue(req.query.companyId);
      const origin = singleQueryValue(req.query.origin);
      const companyId = companyIdRaw ? Number(companyIdRaw) : NaN;
      if (!Number.isInteger(companyId) || companyId <= 0 || !origin)
        throw new Error("Invalid Gmail start request");
      const result = await startGmail(user.id, companyId, origin);
      bindGmailStateCookie(res, result.url);
      res.json(result);
    } catch {
      res.status(400).json({ error: "Unable to start Gmail connection" });
    }
  });

  app.get(GMAIL_CALLBACK_PATH, async (req, res) => {
    await completeGmailCallback(req, res);
  });
}
