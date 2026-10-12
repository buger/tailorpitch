import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import express from "express";
import { createServer, type Server } from "node:http";
import { jwtVerify } from "jose";
const lookup = vi.hoisted(() => ({
  rows: [
    {
      id: 1,
      openId: "existing-owner",
      email: "leonsbox@gmail.com",
      name: "Leonid",
    },
  ] as any[],
}));
vi.mock("./db", () => ({
  getDb: async () => ({
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => lookup.rows }) }),
    }),
  }),
}));
import {
  registerOwnerPasswordRoutes,
  hashOwnerPassword,
  verifyOwnerPassword,
  passwordVersion,
  allowedLoginOrigin,
  loginPasswordHash,
  passwordSessionValid,
} from "./services/ownerPassword";
let server: Server, origin: string;
beforeEach(async () => {
  vi.stubEnv("TAILORPITCH_AUTH_MODE", "owner-password");
  vi.stubEnv("MANUS_JWT_SECRET", "unit-test-signing-secret-no-real-credential");
  vi.stubEnv("MANUS_PROJECT_ID", "test-app");
  vi.stubEnv(
    "TAILORPITCH_OWNER_PASSWORD_HASH",
    hashOwnerPassword("test-only-password", "a".repeat(32))
  );
  lookup.rows = [
    {
      id: 1,
      openId: "existing-owner",
      email: "leonsbox@gmail.com",
      name: "Leonid",
    },
  ];
  const app = express();
  app.use(express.json());
  registerOwnerPasswordRoutes(app);
  server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as any).port}`;
  vi.stubEnv("PUBLIC_SITE_ORIGIN", origin);
});
afterEach(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
  vi.unstubAllEnvs();
});
async function challenge() {
  const r = await fetch(origin + "/api/auth/password/challenge");
  const { nonce } = await r.json();
  return { nonce, cookie: r.headers.get("set-cookie")!.split(";")[0] };
}
async function login(
  c: { nonce: string; cookie: string },
  email = "leonsbox@gmail.com",
  password = "test-only-password",
  requestOrigin = origin
) {
  return fetch(origin + "/api/auth/password/login", {
    method: "POST",
    headers: {
      Origin: requestOrigin,
      Cookie: c.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, nonce: c.nonce }),
  });
}
describe("temporary owner password", () => {
  it("separates demo credentials from owner credentials and revokes only the rotated account", () => {
    const owner = process.env.TAILORPITCH_OWNER_PASSWORD_HASH!;
    const demo = hashOwnerPassword("fixture-demo-password", "b".repeat(32));
    vi.stubEnv("TAILORPITCH_DEMO_PASSWORD_HASH", demo);
    expect(loginPasswordHash("demo@example.com")).toBe(demo);
    expect(loginPasswordHash("other@example.com")).toBeUndefined();
    expect(verifyOwnerPassword("test-only-password", demo)).toBe(false);
    expect(verifyOwnerPassword("fixture-demo-password", owner)).toBe(false);
    const session = {
      authMethod: "owner-password",
      authEmail: "demo@example.com",
      authVersion: passwordVersion(demo),
    };
    expect(passwordSessionValid(session)).toBe(true);
    expect(
      passwordSessionValid({ ...session, authEmail: "leonsbox@gmail.com" })
    ).toBe(false);
    vi.stubEnv(
      "TAILORPITCH_DEMO_PASSWORD_HASH",
      hashOwnerPassword("rotated-fixture-password")
    );
    expect(passwordSessionValid(session)).toBe(false);
    expect(
      passwordSessionValid({
        authMethod: "owner-password",
        authVersion: passwordVersion(owner),
      })
    ).toBe(true);
  });
  it("issues the isolated demo identity and starts website-first onboarding", async () => {
    vi.stubEnv(
      "TAILORPITCH_DEMO_PASSWORD_HASH",
      hashOwnerPassword("fixture-demo-password")
    );
    lookup.rows = [
      {
        id: 2,
        openId: "tailorpitch-demo-v1",
        email: "demo@example.com",
        name: "Demo user",
      },
    ];
    const response = await login(
      await challenge(),
      "demo@example.com",
      "fixture-demo-password"
    );
    expect(response.status).toBe(200);
    expect((await response.json()).redirect).toBe("/app/onboarding");
    const raw = response.headers
      .getSetCookie()
      .find(x => x.startsWith("webdev_app_session="))!
      .split(";")[0]
      .split("=")[1];
    const { payload } = await jwtVerify(
      decodeURIComponent(raw),
      new TextEncoder().encode(process.env.MANUS_JWT_SECRET),
      { algorithms: ["HS256"] }
    );
    expect(payload.openId).toBe("tailorpitch-demo-v1");
    expect(payload.authEmail).toBe("demo@example.com");
    expect(passwordSessionValid(payload)).toBe(true);
  });

  it("verifies a salted scrypt hash and invalidates version when rotated", () => {
    const h = hashOwnerPassword("example-test-password");
    expect(verifyOwnerPassword("example-test-password", h)).toBe(true);
    expect(verifyOwnerPassword("wrong", h)).toBe(false);
    expect(h).not.toContain("example-test-password");
    expect(passwordVersion(h)).not.toBe(
      passwordVersion(hashOwnerPassword("different-test-password"))
    );
  });
  it("returns the existing owner's eight-hour secure session without creating another user", async () => {
    const r = await login(await challenge());
    expect(r.status).toBe(200);
    const cookie = r.headers.get("set-cookie")!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=None");
    expect(cookie).toContain("Max-Age=28800");
    const session = cookie
      .split(",")
      .find(s => s.includes("webdev_app_session="))!
      .trim()
      .split(";")[0]
      .split("=")[1];
    const { payload } = await jwtVerify(
      decodeURIComponent(session),
      new TextEncoder().encode(process.env.MANUS_JWT_SECRET),
      { algorithms: ["HS256"] }
    );
    expect(payload.openId).toBe("existing-owner");
    expect(payload.authMethod).toBe("owner-password");
    expect(payload.appId).toBe("test-app");
  });
  it("rejects wrong email and password with a clear generic error", async () => {
    for (const [email, password] of [
      ["other@example.com", "test-only-password"],
      ["leonsbox@gmail.com", "wrong-password"],
    ]) {
      const r = await login(await challenge(), email, password);
      expect(r.status).toBe(401);
      expect(r.headers.get("set-cookie")).not.toContain("webdev_app_session=");
      expect((await r.json()).error).toContain(
        "Email or password is incorrect"
      );
    }
  });
  it("rejects cross-site Origin and missing challenge without granting a session", async () => {
    expect(
      (
        await login(
          await challenge(),
          undefined,
          undefined,
          "https://evil.example"
        )
      ).status
    ).toBe(403);
    expect((await login({ nonce: "invalid", cookie: "" })).status).toBe(400);
    expect(
      allowedLoginOrigin({ headers: { origin: "https://evil.example" } })
    ).toBe(false);
  });
  it("consumes a browser-bound challenge once", async () => {
    const c = await challenge();
    expect((await login(c)).status).toBe(200);
    expect((await login(c)).status).toBe(400);
  });
  it("does not invent an account if owner lookup is missing", async () => {
    lookup.rows = [];
    const r = await login(await challenge());
    expect(r.status).toBe(403);
    expect((await r.json()).error).toContain("could not be found");
  });
});
