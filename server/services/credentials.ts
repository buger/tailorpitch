import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";
import { and, eq } from "drizzle-orm";
import { integrations } from "../../drizzle/schema";
import { getDb } from "../db";

const CREDENTIAL_VERSION = "v1";
const CREDENTIAL_SALT = Buffer.from(
  "leadloom-mailbox-credentials-salt-v1",
  "utf8"
);
const CREDENTIAL_PURPOSE =
  "leadloom/company-integration-credentials/aes-256-gcm/v1";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

type IntegrationRow = typeof integrations.$inferSelect;

function assertScope(companyId: number, provider: string): void {
  if (!Number.isInteger(companyId) || companyId <= 0) {
    throw new Error("Invalid integration scope");
  }
  if (!/^[a-z][a-z0-9_-]{0,49}$/i.test(provider)) {
    throw new Error("Invalid integration provider");
  }
}

function getMasterKey(): Buffer {
  // Prefer a dedicated stable credential key in production. Configure it before connecting
  // accounts; changing it requires decrypt/re-encrypt migration. Pilot fallback is purpose-
  // separated from JWT signing with HKDF; no plaintext credential is retained.
  const secret =
    process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.MANUS_JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("Credential encryption is not configured");
  }
  return Buffer.from(secret, "utf8");
}

function scopeInfo(companyId: number, provider: string): Buffer {
  return Buffer.from(
    `${CREDENTIAL_PURPOSE}:company:${companyId}:provider:${provider}`,
    "utf8"
  );
}

function scopeAad(companyId: number, provider: string): Buffer {
  return Buffer.from(
    `leadloom-integration-aad:${CREDENTIAL_VERSION}:${companyId}:${provider}`,
    "utf8"
  );
}

function deriveKey(companyId: number, provider: string): Buffer {
  return Buffer.from(
    hkdfSync(
      "sha256",
      getMasterKey(),
      CREDENTIAL_SALT,
      scopeInfo(companyId, provider),
      32
    )
  );
}

function encodeBase64(value: Buffer): string {
  return value.toString("base64");
}

function decodeBase64(value: string): Buffer {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 === 1) {
    throw new Error("Invalid encrypted integration data");
  }
  return Buffer.from(value, "base64");
}

/** Encrypt a JSON-compatible integration config with tenant/provider-bound authenticated encryption. */
export function encryptConfig(
  config: unknown,
  companyId: number,
  provider: string
): string {
  assertScope(companyId, provider);

  let plaintext: string;
  try {
    plaintext = JSON.stringify(config);
  } catch {
    throw new Error("Integration configuration is not serializable");
  }
  if (plaintext === undefined) {
    throw new Error("Integration configuration is not serializable");
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(
    "aes-256-gcm",
    deriveKey(companyId, provider),
    iv
  );
  cipher.setAAD(scopeAad(companyId, provider));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    CREDENTIAL_VERSION,
    encodeBase64(iv),
    encodeBase64(tag),
    encodeBase64(ciphertext),
  ].join(".");
}

/** Decrypt a config only for the exact company/provider scope used to encrypt it. */
export function decryptConfig<T>(
  ciphertext: string,
  companyId: number,
  provider: string
): T {
  assertScope(companyId, provider);
  if (typeof ciphertext !== "string") {
    throw new Error("Invalid encrypted integration data");
  }

  const parts = ciphertext.split(".");
  if (parts.length !== 4 || parts[0] !== CREDENTIAL_VERSION) {
    throw new Error("Invalid encrypted integration data");
  }

  try {
    const iv = decodeBase64(parts[1]);
    const tag = decodeBase64(parts[2]);
    const encrypted = decodeBase64(parts[3]);
    if (
      iv.length !== IV_BYTES ||
      tag.length !== AUTH_TAG_BYTES ||
      encrypted.length === 0
    ) {
      throw new Error("Invalid encrypted integration data");
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      deriveKey(companyId, provider),
      iv
    );
    decipher.setAAD(scopeAad(companyId, provider));
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(plaintext) as T;
  } catch {
    // Deliberately do not expose whether the failure was a bad scope, key, tag, or payload.
    throw new Error("Unable to decrypt integration configuration");
  }
}

async function requiredDb() {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  return database;
}

export async function saveIntegration(
  companyId: number,
  provider: string,
  config: unknown,
  displayName: string
): Promise<void> {
  assertScope(companyId, provider);
  if (
    typeof displayName !== "string" ||
    displayName.trim().length === 0 ||
    displayName.length > 320
  ) {
    throw new Error("Invalid integration display name");
  }

  const database = await requiredDb();
  const encryptedConfig = encryptConfig(config, companyId, provider);
  await database
    .insert(integrations)
    .values({
      companyId,
      provider,
      encryptedConfig,
      displayName: displayName.trim(),
      status: "connected",
    })
    .onDuplicateKeyUpdate({
      set: {
        encryptedConfig,
        displayName: displayName.trim(),
        status: "connected",
      },
    });
}

export async function getIntegration<T>(
  companyId: number,
  provider: string
): Promise<{ config: T; row: IntegrationRow } | null> {
  assertScope(companyId, provider);
  const database = await requiredDb();
  const rows = await database
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.companyId, companyId),
        eq(integrations.provider, provider)
      )
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    config: decryptConfig<T>(row.encryptedConfig, companyId, provider),
    row,
  };
}
