export function signupSourceLabel(source: string): string {
  if (source === "leadloom-waitlist") return "TailorPitch early access";
  if (/^page-\d+$/.test(source)) return `Personalized page #${source.slice(5)}`;
  return source;
}
export type SignupExportRow = {
  email: string;
  source: string;
  consent: number;
  consentText: string;
  createdAt: Date;
};
function csvCell(value: string): string {
  // Neutralize spreadsheet formulas without changing the stored email/address.
  const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function signupCsv(rows: SignupExportRow[]): string {
  return (
    "\uFEFF" +
    [
      ["Email", "Source", "Consented", "Consent text", "Received UTC"],
      ...rows.map(row => [
        row.email,
        signupSourceLabel(row.source),
        row.consent ? "Yes" : "No",
        row.consentText,
        row.createdAt.toISOString(),
      ]),
    ]
      .map(row => row.map(csvCell).join(","))
      .join("\r\n")
  );
}
