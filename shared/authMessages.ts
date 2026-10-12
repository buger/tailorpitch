export const loginMessages = {
  cancelled:
    "Sign-in was cancelled. Nothing changed. Try again when you are ready.",
  invalid_state:
    "This sign-in link expired or could not be verified. Start sign-in again from this dashboard. If it keeps happening, open the dashboard in a new tab and allow cookies.",
  failed:
    "We could not complete sign-in. Please try again. No dashboard access was granted.",
  user_not_found:
    "Your sign-in succeeded, but we could not load your account. Sign out and try again, or contact the workspace owner.",
  account_sync_failed:
    "We could not retrieve your account from the sign-in provider. Please try signing in again.",
  missing_email:
    "Your sign-in provider did not return an email address. Use an account with an email or contact the workspace owner.",
  configuration:
    "Sign-in is not configured for this app. Contact the workspace owner.",
} as const;
export type LoginErrorCode = keyof typeof loginMessages;
export function loginErrorMessage(
  code: string | null | undefined
): string | undefined {
  return code && Object.prototype.hasOwnProperty.call(loginMessages, code)
    ? loginMessages[code as LoginErrorCode]
    : undefined;
}
export const noWorkspaceAccessMessage =
  "Your account does not have access to this workspace. Sign in with an approved account or contact the workspace owner.";
