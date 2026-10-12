export function observedContact(value: string, corpus: string) {
  if (!value) return true;
  if (value.length < 3) return false;
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(^|[^\\p{L}\\p{N}_])${escaped}($|[^\\p{L}\\p{N}_])`,
    "iu"
  ).test(corpus);
}
export function clearUnobservedContacts<
  T extends {
    email: string;
    contactName: string;
    title: string;
    linkedinUrl: string;
    xUrl: string;
  },
>(contact: T, corpus: string) {
  for (const key of [
    "email",
    "contactName",
    "title",
    "linkedinUrl",
    "xUrl",
  ] as const)
    if (!observedContact(contact[key], corpus)) contact[key] = "";
  return contact;
}
