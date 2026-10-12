import { TRPCError } from "@trpc/server";

const API_ORIGIN = "https://api.apify.com/v2/";
export const APIFY_ACTORS = {
  discovery: "apify~google-search-scraper",
  research: "apify~website-content-crawler",
} as const;

function assertCompany(companyId: number) {
  if (!Number.isInteger(companyId) || companyId <= 0)
    throw new Error("Invalid company scope.");
}
function applicationToken() {
  return process.env.TAILORPITCH_APIFY_API_TOKEN?.trim() || "";
}
export function hasManagedApify() {
  return Boolean(applicationToken());
}
async function credential(companyId: number) {
  assertCompany(companyId);
  const token = applicationToken();
  if (token)
    return { token, managed: true, displayName: "Included with TailorPitch" };
  return null;
}
export async function getApifyStatus(companyId: number) {
  const current = await credential(companyId);
  return {
    connected: Boolean(current),
    managed: current?.managed ?? true,
    displayName: current?.displayName ?? "TailorPitch sourcing",
  };
}
export class ApifyRequestError extends Error {
  constructor(
    message: string,
    public readonly outcomeUnknown = false,
    public readonly httpStatus?: number
  ) {
    super(message);
    this.name = "ApifyRequestError";
  }
}
export async function apifyRequest(
  companyId: number,
  path: string,
  init: RequestInit = {}
) {
  const current = await credential(companyId);
  if (!current)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Lead sourcing is not configured yet. The TailorPitch owner needs to complete Apify setup; you do not need a personal token.",
    });
  const url = new URL(path, API_ORIGIN);
  if (
    url.origin !== new URL(API_ORIGIN).origin ||
    !url.pathname.startsWith("/v2/") ||
    url.username ||
    url.password ||
    url.searchParams.has("token")
  ) {
    throw new Error("Invalid Apify API path.");
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${current.token}`);
  headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new ApifyRequestError(
      "Apify did not confirm the request. Check the original run before starting another.",
      true
    );
  }
  if (!response.ok) {
    const message =
      response.status === 401 || response.status === 403
        ? "Apify authorization failed. The TailorPitch owner needs to check the server credential and actor permissions."
        : response.status === 402
          ? "Apify account usage is unavailable. The TailorPitch owner needs to check the provider account limits."
          : response.status === 429
            ? "Apify is at its concurrency or request limit. Wait and check the original run before retrying."
            : `Apify request failed (${response.status}). Check the original run before retrying.`;
    throw new ApifyRequestError(
      message,
      response.status >= 500,
      response.status
    );
  }
  let body: any;
  try {
    body = await response.json();
  } catch {
    throw new ApifyRequestError(
      "Apify returned an unreadable response. Check the original run before retrying.",
      true
    );
  }
  if (body?.error)
    throw new ApifyRequestError(
      "Apify returned an unexpected error. Check the original run before retrying.",
      true
    );
  return body;
}
export async function verifyApify(companyId: number) {
  const account = await apifyRequest(companyId, "users/me");
  if (!account.data?.id)
    throw new Error("Apify did not confirm the account identity.");
  const actors = await Promise.all(
    Object.values(APIFY_ACTORS).map(async actor => {
      const result = await apifyRequest(companyId, `actors/${actor}`);
      if (!result.data?.id)
        throw new Error("A required Apify actor is not accessible.");
      return actor.replace("~", "/");
    })
  );
  return {
    success: true as const,
    checkedAt: new Date().toISOString(),
    actors,
    managed: hasManagedApify(),
  };
}
