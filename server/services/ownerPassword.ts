import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { parse } from "cookie";
import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";
import { COOKIE_NAME } from "../../shared/const";
import { getSessionCookieOptions } from "../_core/cookies";

export const OWNER_LOGIN_EMAIL = "leonsbox@gmail.com";
const CHALLENGE_COOKIE = "__Host-tailorpitch-login";
const SESSION_MS = 8 * 60 * 60 * 1000;
const attempts = new Map<string, { count: number; until: number }>();
const consumed = new Map<string, number>();
let cachedPassword: string | undefined;
let cachedHash: string | undefined;
export function hashOwnerPassword(
  password: string,
  salt = randomBytes(16).toString("hex")
): string {
  if (password.length < 1 || password.length > 1024)
    throw Error("Use a password between 1 and 1024 characters.");
  return `scrypt-v1:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function ownerPasswordHash(): string | undefined {
  if (process.env.TAILORPITCH_OWNER_PASSWORD_HASH)
    return process.env.TAILORPITCH_OWNER_PASSWORD_HASH;
  const password = process.env.TAILORPITCH_OWNER_PASSWORD;
  if (!password) return undefined;
  // Deterministic salt supports revocation across instances, never sent to a client.
  if (password !== cachedPassword) {
    cachedPassword = password;
    cachedHash = hashOwnerPassword(
      password,
      createHash("sha256")
        .update(process.env.MANUS_JWT_SECRET || "")
        .update("owner-password-v1")
        .digest("hex")
        .slice(0, 32)
    );
  }
  return cachedHash;
}
export function passwordVersion(hash = ownerPasswordHash()): string {
  if (!hash) throw Error("Owner login is not configured.");
  return createHash("sha256").update(hash).digest("hex");
}
export function verifyOwnerPassword(
  password: unknown,
  hash = ownerPasswordHash()
): boolean {
  if (!hash || typeof password !== "string" || password.length > 1024)
    return false;
  const [version, salt, digest] = hash.split(":");
  if (
    version !== "scrypt-v1" ||
    !/^[a-f0-9]{32}$/.test(salt) ||
    !/^[a-f0-9]{128}$/.test(digest)
  )
    return false;
  return timingSafeEqual(
    scryptSync(password, salt, 64),
    Buffer.from(digest, "hex")
  );
}
function secret() {
  const key = process.env.MANUS_JWT_SECRET;
  if (!key || key.length < 16) throw Error("Session signing is unavailable.");
  return new TextEncoder().encode(key);
}
export function allowedLoginOrigin(req: Pick<Request, "headers">): boolean {
  try {
    const origin = new URL(process.env.PUBLIC_SITE_ORIGIN || "").origin;
    return req.headers.origin === origin;
  } catch {
    return false;
  }
}
function rateAllowed(ip: string): boolean {
  const now = Date.now();
  for (const [key, value] of attempts)
    if (value.until <= now) attempts.delete(key);
  const current = attempts.get(ip) || { count: 0, until: now + 15 * 60_000 };
  current.count++;
  attempts.set(ip, current);
  return attempts.size <= 10_000 && current.count <= 10;
}
function fail(res: Response, status: number, message: string) {
  res.status(status).json({ error: message });
}
export function registerOwnerPasswordRoutes(app: Express) {
  app.get("/api/auth/password/challenge", async (_req, res) => {
    if (
      process.env.TAILORPITCH_AUTH_MODE !== "owner-password" ||
      !ownerPasswordHash()
    ) {
      fail(res, 503, "Temporary owner sign-in is not configured.");
      return;
    }
    const now = Date.now();
    for (const [token, expiry] of consumed)
      if (expiry <= now) consumed.delete(token);
    const nonce = randomBytes(32).toString("hex");
    const token = await new SignJWT({ purpose: "owner-login", nonce })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(secret());
    res.cookie(CHALLENGE_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 300_000,
    });
    res.set("Cache-Control", "no-store").json({ nonce });
  });
  app.post("/api/auth/password/login", async (req, res) => {
    res.set("Cache-Control", "no-store");
    if (
      process.env.TAILORPITCH_AUTH_MODE !== "owner-password" ||
      !ownerPasswordHash()
    ) {
      fail(res, 503, "Temporary owner sign-in is not configured.");
      return;
    }
    if (!allowedLoginOrigin(req)) {
      fail(res, 403, "Start sign-in from the TailorPitch dashboard.");
      return;
    }
    if (!rateAllowed(req.ip || req.socket.remoteAddress || "unknown")) {
      res.set("Retry-After", "900");
      fail(
        res,
        429,
        "Too many sign-in attempts. Please wait 15 minutes and try again."
      );
      return;
    }
    try {
      const token = parse(req.headers.cookie || "")[CHALLENGE_COOKIE];
      res.clearCookie(CHALLENGE_COOKIE, {
        path: "/",
        secure: true,
        sameSite: "none",
      });
      if (!token) throw Error("Challenge missing");
      const { payload } = await jwtVerify(token, secret(), {
        algorithms: ["HS256"],
      });
      if (
        payload.purpose !== "owner-login" ||
        typeof payload.nonce !== "string" ||
        payload.nonce !== req.body?.nonce ||
        consumed.has(payload.nonce)
      )
        throw Error("Challenge invalid");
      if (consumed.size > 10_000) throw Error("Challenge capacity");
      consumed.set(payload.nonce, Date.now() + 300_000);
    } catch {
      fail(res, 400, "This sign-in request expired. Please try again.");
      return;
    }
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const validPassword = verifyOwnerPassword(req.body?.password);
    if (email !== OWNER_LOGIN_EMAIL || !validPassword) {
      fail(
        res,
        401,
        "Email or password is incorrect. This temporary login is available only to the approved workspace owner."
      );
      return;
    }
    try {
      const d = await getDb();
      if (!d) throw Error("Database unavailable");
      const owners = await d
        .select()
        .from(users)
        .where(eq(users.email, OWNER_LOGIN_EMAIL))
        .limit(2);
      if (owners.length !== 1) {
        fail(
          res,
          403,
          "Your owner account could not be found unambiguously. Contact the workspace administrator."
        );
        return;
      }
      const owner = owners[0];
      const token = await new SignJWT({
        openId: owner.openId,
        appId: process.env.MANUS_PROJECT_ID,
        name: owner.name || "",
        authMethod: "owner-password",
        authVersion: passwordVersion(),
      })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuedAt()
        .setExpirationTime("8h")
        .sign(secret());
      res.cookie(COOKIE_NAME, token, {
        ...getSessionCookieOptions(req),
        maxAge: SESSION_MS,
      });
      res.json({ ok: true, redirect: "/app" });
    } catch {
      fail(
        res,
        503,
        "Sign-in could not finish. Please try again. No new access was granted."
      );
    }
  });
}
