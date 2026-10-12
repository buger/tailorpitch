import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  encodeOAuthState,
  OAUTH_STATE_COOKIE,
  COOKIE_NAME,
} from "../shared/const";
import {
  loginErrorMessage,
  noWorkspaceAccessMessage,
} from "../shared/authMessages";
const mocks = vi.hoisted(() => ({
  exchange: vi.fn(),
  info: vi.fn(),
  session: vi.fn(),
  upsert: vi.fn(),
  user: vi.fn(),
}));
vi.mock("./_core/sdk", () => ({
  sdk: {
    exchangeCodeForToken: mocks.exchange,
    getUserInfo: mocks.info,
    createSessionToken: mocks.session,
  },
}));
vi.mock("./db", () => ({
  upsertUser: mocks.upsert,
  getUserByOpenId: mocks.user,
}));
import { registerOAuthRoutes } from "./_core/oauth";
function callback() {
  let handler: any;
  registerOAuthRoutes({ get: (_path: string, h: any) => (handler = h) } as any);
  return handler;
}
function response() {
  const res: any = {
    clearCookie: vi.fn(),
    set: vi.fn(),
    redirect: vi.fn(),
    cookie: vi.fn(),
  };
  Object.values(res).forEach((fn: any) => fn.mockReturnValue(res));
  return res;
}
const request = () => ({
  query: {
    code: "test-code",
    state: encodeOAuthState({
      redirectUri: "https://app.example/api/oauth/callback",
      nonce: "test-nonce",
    }),
  },
  headers: {
    cookie: `${OAUTH_STATE_COOKIE}=test-nonce`,
    "x-forwarded-proto": "https",
  },
  protocol: "https",
  secure: true,
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.exchange.mockResolvedValue({ accessToken: "mock-token" });
  mocks.info.mockResolvedValue({
    openId: "test-id",
    email: "leonsbox@gmail.com",
    name: "Owner",
    loginMethod: "google",
  });
  mocks.user.mockResolvedValue({ id: 1 });
  mocks.upsert.mockResolvedValue(undefined);
  mocks.session.mockResolvedValue("mock-signed-session");
});
describe("dashboard login experience", () => {
  it("returns cancelled login to safe readable screen", async () => {
    const res = response();
    await callback()({ query: { error: "access_denied" }, headers: {} }, res);
    expect(res.redirect).toHaveBeenCalledWith(
      303,
      "/app?login_error=cancelled"
    );
    expect(mocks.exchange).not.toHaveBeenCalled();
  });
  it("rejects missing or mismatched state before token exchange", async () => {
    for (const req of [
      { query: {}, headers: {} },
      { ...request(), headers: { cookie: "" } },
    ]) {
      const res = response();
      await callback()(req, res);
      expect(res.redirect).toHaveBeenCalledWith(
        303,
        "/app?login_error=invalid_state"
      );
    }
    expect(mocks.exchange).not.toHaveBeenCalled();
  });
  it("routes real validated sign-in to dashboard with secure cookie", async () => {
    const res = response();
    await callback()(request(), res);
    expect(res.redirect).toHaveBeenCalledWith(302, "/app");
    expect(res.cookie).toHaveBeenCalledWith(
      COOKIE_NAME,
      "mock-signed-session",
      expect.objectContaining({
        secure: true,
        sameSite: "none",
        httpOnly: true,
      })
    );
  });
  it("does not mint session if authenticated user cannot be loaded", async () => {
    mocks.user.mockResolvedValue(undefined);
    const res = response();
    await callback()(request(), res);
    expect(res.redirect).toHaveBeenCalledWith(
      303,
      "/app?login_error=user_not_found"
    );
    expect(mocks.session).not.toHaveBeenCalled();
  });
  it("does not grant access without a provider email", async () => {
    mocks.info.mockResolvedValue({ openId: "test-id" });
    const res = response();
    await callback()(request(), res);
    expect(res.redirect).toHaveBeenCalledWith(
      303,
      "/app?login_error=missing_email"
    );
    expect(mocks.session).not.toHaveBeenCalled();
  });
  it("allows only fixed error messages, not reflected unknown query text", () => {
    expect(loginErrorMessage("invalid_state")).toContain("expired");
    expect(loginErrorMessage("<script>")).toBeUndefined();
    expect(noWorkspaceAccessMessage).toContain("does not have access");
  });
});
