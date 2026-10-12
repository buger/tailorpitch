export function passwordResponseError(status: number, text: string): string {
  if (status === 429)
    return "Too many sign-in attempts. Please wait 15 minutes and try again.";
  try {
    const value = JSON.parse(text);
    if (typeof value.error === "string" && value.error.length < 500)
      return value.error;
  } catch {
    /* Upstream proxies can return HTML, never show parser errors. */
  }
  if (status >= 500)
    return "Sign-in is temporarily unavailable. Please try again shortly.";
  return "Sign-in could not finish. Please try again from the TailorPitch dashboard.";
}
