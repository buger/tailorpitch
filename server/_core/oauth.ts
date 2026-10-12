import {
  COOKIE_NAME,
  ONE_YEAR_MS,
  OAUTH_STATE_COOKIE,
  decodeOAuthState,
} from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import type { LoginErrorCode } from "../../shared/authMessages";
function getQueryParam(req: Request, key: string) {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}
export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const fail = (error: LoginErrorCode) => {
      res.clearCookie(OAUTH_STATE_COOKIE, {
        path: "/",
        secure: true,
        sameSite: "none",
      });
      res
        .set("Cache-Control", "no-store")
        .redirect(303, `/app?login_error=${error}`);
    };
    if (getQueryParam(req, "error")) {
      fail("cancelled");
      return;
    }
    const code = getQueryParam(req, "code"),
      state = getQueryParam(req, "state");
    if (!code || !state) {
      fail("invalid_state");
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[
      OAUTH_STATE_COOKIE
    ];
    if (!nonce || nonce !== expectedNonce) {
      fail("invalid_state");
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, {
      path: "/",
      secure: true,
      sameSite: "none",
    });
    try {
      const token = await sdk.exchangeCodeForToken(code, state);
      const identity = await sdk.getUserInfo(token.accessToken);
      if (!identity.openId) {
        fail("user_not_found");
        return;
      }
      if (!identity.email) {
        fail("missing_email");
        return;
      }
      await db.upsertUser({
        openId: identity.openId,
        name: identity.name || null,
        email: identity.email,
        loginMethod: identity.loginMethod ?? identity.platform ?? null,
        lastSignedIn: new Date(),
      });
      const user = await db.getUserByOpenId(identity.openId);
      if (!user) {
        fail("user_not_found");
        return;
      }
      const session = await sdk.createSessionToken(identity.openId, {
        name: identity.name || "",
        expiresInMs: ONE_YEAR_MS,
      });
      res.cookie(COOKIE_NAME, session, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS,
      });
      res.set("Cache-Control", "no-store").redirect(302, "/app");
    } catch (error) {
      console.error(
        "[OAuth] Callback failed",
        error instanceof Error ? error.message : "unknown error"
      );
      fail("failed");
    }
  });
}
