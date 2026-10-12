import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { loginMessages } from "../../shared/authMessages";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  authError?: string;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let authError: string | undefined;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
    const message = error instanceof Error ? error.message : "";
    if (message === "User not found") authError = loginMessages.user_not_found;
    if (message === "Failed to sync user info")
      authError = loginMessages.account_sync_failed;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    authError,
  };
}
