import { useState } from "react";
import { Check, ChevronDown, KeyRound } from "lucide-react";
import type { MailboxStatus } from "@/components/leadloom-types";
import { api } from "@/components/leadloom-types";
import {
  Button,
  MonoLabel,
  StatusChip,
  TextInput,
  Toast,
} from "@/components/LeadloomUI";

export function GmailSetup({
  status,
  onToast,
}: {
  status?: MailboxStatus;
  onToast: (message: string) => void;
}) {
  const utils = api.useUtils();
  const configure = api.mailbox.configureGmail.useMutation();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [open, setOpen] = useState(false);
  const callback = `${window.location.origin}${status?.gmailCallbackPath || "/api/mailbox/gmail/callback"}`;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await configure.mutateAsync({ clientId, clientSecret });
      await utils.mailbox.status.invalidate();
      setClientId("");
      setClientSecret("");
      onToast("Google OAuth app credentials saved. You can connect Gmail now.");
    } catch (error) {
      onToast(
        error instanceof Error
          ? error.message
          : "Google OAuth setup could not be saved."
      );
    }
  };
  return (
    <section className="border border-line bg-white p-6 sm:p-7 xl:col-span-2">
      <details
        open={open}
        onToggle={event =>
          setOpen((event.currentTarget as HTMLDetailsElement).open)
        }
      >
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-terracotta" />
              <MonoLabel>Google OAuth app setup</MonoLabel>
            </div>
            <h2 className="mt-3 font-display text-2xl tracking-[-.04em]">
              Use your own Gmail client.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              Create a Google Web application OAuth client, enable the Gmail
              API, and add the pilot email as a consent-screen test user.
              Credentials are encrypted server-side and never stored in this
              browser.
            </p>
          </div>
          <ChevronDown className="mt-1 h-5 w-5 text-ink-muted transition-transform open:rotate-180" />
        </summary>
        <div className="mt-6 border-t border-line pt-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr_.85fr]">
            <div>
              <TextInput
                label="OAuth client ID"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder="123…apps.googleusercontent.com"
                autoComplete="off"
              />
            </div>
            <div>
              <TextInput
                label="OAuth client secret"
                type="password"
                value={clientSecret}
                onChange={e => setClientSecret(e.target.value)}
                placeholder="GOCSPX…"
                autoComplete="new-password"
              />
            </div>
            <div className="border border-terracotta/20 bg-terracotta-pale/40 p-4">
              <MonoLabel>Authorized redirect URI</MonoLabel>
              <p className="mt-2 break-all font-mono text-[11px] leading-5 text-terracotta">
                {callback}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={submit}
              disabled={configure.isPending || !clientId || !clientSecret}
            >
              {configure.isPending ? "Saving securely…" : "Save Google app"}
            </Button>
            {status?.gmailAvailable && (
              <StatusChip tone="good">
                <Check className="h-3 w-3" />
                Configured
              </StatusChip>
            )}
          </div>
          <p className="mt-5 text-xs leading-5 text-ink-muted">
            Google may require the pilot email{" "}
            <strong>hello@reqproof.com</strong> to be added as a test user while
            the OAuth consent screen is in testing. The callback is derived from
            the browser-visible origin.
          </p>
        </div>
      </details>
    </section>
  );
}
