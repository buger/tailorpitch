import { useEffect, useState } from "react";
import {
  Globe2,
  ImagePlus,
  Link2,
  Mail,
  PlugZap,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import type { Brand } from "@shared/domain";
import type { Workspace } from "@/components/leadloom-types";
import { api } from "@/components/leadloom-types";
import {
  Button,
  MonoLabel,
  SectionHeader,
  StatusChip,
  TextArea,
  TextInput,
  Toast,
} from "@/components/LeadloomUI";
import { TailorPitchIntegrations } from "@/components/TailorPitchIntegrations";
import { GmailSetup } from "@/components/GmailSetup";

const tabs = ["Brand & voice", "Integrations", "Domain"] as const;
type Tab = (typeof tabs)[number];

export function SettingsView({ workspace }: { workspace: Workspace }) {
  const [tab, setTab] = useState<Tab>("Brand & voice");
  return (
    <>
      <SectionHeader
        eyebrow="Settings / company workspace"
        title="Make the system sound like you."
        description="Brand instructions feed page and outreach generation. Credentials stay on the server and are cleared from the form after a successful connection."
        action={
          <a href="/app/onboarding">
            <Button variant="secondary">Analyze website again</Button>
          </a>
        }
      />
      <div className="mb-8 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map(item => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`shrink-0 border-b-2 px-4 pb-3 text-sm font-semibold ${tab === item ? "border-terracotta text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "Brand & voice" && <BrandSettings workspace={workspace} />}
      {tab === "Integrations" && (
        <>
          <TailorPitchIntegrations />
          <IntegrationSettings />
        </>
      )}
      {tab === "Domain" && <DomainSettings workspace={workspace} />}
    </>
  );
}

function BrandSettings({ workspace }: { workspace: Workspace }) {
  const utils = api.useUtils();
  const save = api.workspace.saveBrand.useMutation();
  const upload = api.workspace.uploadAsset.useMutation();
  const remove = api.workspace.removeAsset.useMutation();
  const [brand, setBrand] = useState<Brand>(workspace.company.brand);
  const [origin, setOrigin] = useState(workspace.company.publicOrigin || "");
  const [assetNote, setAssetNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const savedBrand = JSON.stringify(workspace.company.brand);
  useEffect(() => {
    setBrand(JSON.parse(savedBrand) as Brand);
    setOrigin(workspace.company.publicOrigin || "");
  }, [savedBrand, workspace.company.publicOrigin]);
  const set = (key: keyof Brand, value: string) =>
    setBrand(prev => ({ ...prev, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await save.mutateAsync({ brand, publicOrigin: origin });
      await utils.workspace.get.invalidate();
      setToast("Brand profile saved.");
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : "Brand profile could not be saved."
      );
    }
  };
  const uploadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !/^image\/(png|jpeg|webp)$/.test(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setToast("Use a PNG, JPEG or WebP image under 5MB.");
      return;
    }
    const mime = file.type as "image/png" | "image/jpeg" | "image/webp";
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await upload.mutateAsync({
          name: file.name,
          mime,
          base64: String(reader.result).split(",")[1] || "",
          note: assetNote,
        });
        await utils.workspace.get.invalidate();
        setAssetNote("");
        setToast("Asset uploaded.");
      } catch (error) {
        setToast(
          error instanceof Error ? error.message : "Asset upload failed."
        );
      }
    };
    reader.readAsDataURL(file);
  };
  return (
    <form onSubmit={submit} className="grid gap-8 xl:grid-cols-[1.1fr_.9fr]">
      <div className="space-y-8">
        <section className="border border-line bg-white p-6 sm:p-7">
          <MonoLabel>Company voice</MonoLabel>
          <h2 className="mt-3 font-display text-2xl tracking-[-.04em]">
            The instruction layer
          </h2>
          <div className="mt-6 space-y-5">
            <TextArea
              label="Company offer"
              required
              value={brand.offer}
              onChange={e => set("offer", e.target.value)}
              hint="What you actually offer. Keep this grounded and specific."
            />
            <TextArea
              label="Voice"
              value={brand.voice}
              onChange={e => set("voice", e.target.value)}
              hint="How the writing should sound — not just adjectives."
            />
            <TextArea
              label="Website instructions"
              value={brand.websiteInstructions}
              onChange={e => set("websiteInstructions", e.target.value)}
            />
            <TextInput
              label="Public origin"
              type="url"
              value={origin}
              onChange={e => setOrigin(e.target.value)}
              placeholder="https://app.example.com"
              hint="Used for public page and unsubscribe links; this does not claim DNS is connected."
            />
            <TextArea
              label="Outreach instructions"
              value={brand.outreachInstructions}
              onChange={e => set("outreachInstructions", e.target.value)}
            />
            <TextArea
              label="Approved claims and limitations"
              value={brand.approvedClaims}
              onChange={e => set("approvedClaims", e.target.value)}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextInput
                label="Booking URL"
                type="url"
                value={brand.bookingUrl}
                onChange={e => set("bookingUrl", e.target.value)}
              />
              <TextInput
                label="Logo URL"
                type="text"
                hint="HTTPS URL or an uploaded /manus-storage/ asset path."
                value={brand.logoUrl}
                onChange={e => set("logoUrl", e.target.value)}
              />
            </div>
          </div>
        </section>
        <section className="border border-line bg-white p-6 sm:p-7">
          <MonoLabel>Color system</MonoLabel>
          <p className="mt-2 text-sm text-ink-muted">
            Proof defaults are editable. Keep the official Proof mark intact;
            sage is an accent, never a headline color.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <TextInput
              label="Primary"
              type="color"
              value={brand.primaryColor}
              onChange={e => set("primaryColor", e.target.value)}
              className="h-11 p-1"
            />
            <TextInput
              label="Paper / background"
              type="color"
              value={brand.backgroundColor}
              onChange={e => set("backgroundColor", e.target.value)}
              className="h-11 p-1"
            />
            <TextInput
              label="Accent"
              type="color"
              value={brand.accentColor}
              onChange={e => set("accentColor", e.target.value)}
              className="h-11 p-1"
            />
          </div>
        </section>
        <Button
          type="submit"
          disabled={save.isPending}
          className="w-full sm:w-auto"
        >
          <Save className="h-4 w-4" />
          {save.isPending ? "Saving…" : "Save brand profile"}
        </Button>
      </div>
      <aside className="space-y-5">
        <section className="border border-line bg-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <MonoLabel>Assets / visual context</MonoLabel>
              <h2 className="mt-3 font-display text-2xl tracking-[-.04em]">
                Give generation something real.
              </h2>
            </div>
            <ImagePlus className="h-5 w-5 text-terracotta" />
          </div>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Upload visual references for generated pages. SVG uploads are
            excluded; the official Proof mark remains linked from its source.
          </p>
          <TextInput
            label="Asset note"
            value={assetNote}
            onChange={e => setAssetNote(e.target.value)}
            placeholder="e.g. homepage hero texture"
          />
          <label className="mt-4 flex min-h-11 items-center justify-center gap-2 border border-dashed border-line text-xs font-semibold hover:border-terracotta">
            <Upload className="h-4 w-4" />
            {upload.isPending ? "Uploading…" : "Upload PNG, JPEG or WebP"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={uploadFile}
              disabled={upload.isPending}
            />
          </label>
          <div className="mt-5 space-y-3">
            {workspace.assets.length ? (
              workspace.assets.map(asset => (
                <div
                  key={asset.id}
                  className="flex items-center gap-3 border-t border-line pt-3"
                >
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    title="Open original reference"
                    className="shrink-0"
                  >
                    <img
                      src={asset.url}
                      alt={asset.name}
                      className="h-16 w-20 border border-line bg-paper object-contain"
                    />
                  </a>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">
                      {asset.name}
                    </p>
                    <p className="mt-1 line-clamp-3 text-[11px] leading-4 text-ink-muted">
                      {asset.note?.split("Owner source sha256:")[0] ||
                        "No note"}
                    </p>
                    {asset.note?.includes("exploration board") ? (
                      <span className="mt-2 block font-mono text-[9px] uppercase tracking-[.08em] text-terracotta">
                        Design inspiration · original preserved
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="mt-1 text-[11px] font-semibold text-terracotta underline"
                        onClick={() => set("logoUrl", asset.url)}
                      >
                        Use as logo
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="p-2 text-ink-muted hover:text-red-700"
                    onClick={async () => {
                      if (
                        !window.confirm("Hide this asset from the workspace?")
                      )
                        return;
                      await remove.mutateAsync({ id: asset.id });
                      await utils.workspace.get.invalidate();
                      setToast("Asset hidden.");
                    }}
                    aria-label={`Hide ${asset.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <p className="border-t border-line pt-4 text-xs text-ink-muted">
                No uploaded assets yet.
              </p>
            )}
          </div>
        </section>
        <section className="border border-line bg-white p-6">
          <MonoLabel>Inspiration URLs</MonoLabel>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            HTTPS references guide tone and layout; they do not copy content.
          </p>
          {brand.inspiration.map((reference, i) => (
            <div key={i} className="mt-4 border-t border-line pt-4">
              <TextInput
                label={`Reference ${i + 1}`}
                type="url"
                value={reference.url}
                onChange={e =>
                  setBrand(prev => ({
                    ...prev,
                    inspiration: prev.inspiration.map((item, j) =>
                      j === i ? { ...item, url: e.target.value } : item
                    ),
                  }))
                }
              />
              <TextInput
                className="mt-3"
                label="Note"
                value={reference.note}
                onChange={e =>
                  setBrand(prev => ({
                    ...prev,
                    inspiration: prev.inspiration.map((item, j) =>
                      j === i ? { ...item, note: e.target.value } : item
                    ),
                  }))
                }
              />
              <button
                type="button"
                className="mt-2 text-[11px] text-red-700 underline"
                onClick={() =>
                  setBrand(prev => ({
                    ...prev,
                    inspiration: prev.inspiration.filter((_, j) => i !== j),
                  }))
                }
              >
                Remove reference
              </button>
            </div>
          ))}
          {brand.inspiration.length < 12 && (
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-terracotta"
              onClick={() =>
                setBrand(prev => ({
                  ...prev,
                  inspiration: [
                    ...prev.inspiration,
                    { url: "https://example.com", note: "" },
                  ],
                }))
              }
            >
              <Link2 className="h-3.5 w-3.5" />
              Add inspiration URL
            </button>
          )}
        </section>
      </aside>
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </form>
  );
}

function IntegrationSettings() {
  const status = api.mailbox.status.useQuery(undefined, { retry: false });
  const verifyApify = api.mailbox.verifyApify.useMutation();
  const connectImap = api.mailbox.connectImap.useMutation();
  const startGmail = api.mailbox.startGmail.useMutation();
  const disconnect = api.mailbox.disconnect.useMutation();

  const [imap, setImap] = useState({
    email: "",
    username: "",
    password: "",
    imapHost: "",
    imapPort: "993",
    imapSecure: true,
    smtpHost: "",
    smtpPort: "465",
    smtpSecure: true,
  });
  const [toast, setToast] = useState<string | null>(null);
  const checkApify = async () => {
    try {
      await verifyApify.mutateAsync();
      setToast(
        "Apify account and both research actors verified. No scrape was started."
      );
      await status.refetch();
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Sourcing verification failed."
      );
    }
  };
  const connectM = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await connectImap.mutateAsync({
        ...imap,
        imapPort: Number(imap.imapPort),
        smtpPort: Number(imap.smtpPort),
      });
      setImap(v => ({ ...v, password: "" }));
      setToast("Mailbox connected.");
      await status.refetch();
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Mailbox connection failed."
      );
    }
  };
  const gmail = async () => {
    try {
      const result = await startGmail.mutateAsync({
        origin: window.location.origin,
      });
      window.location.href = result.url;
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : "Google OAuth client setup required."
      );
    }
  };
  const disconnectProvider = async (provider: "gmail" | "imap") => {
    if (
      !window.confirm(`Disconnect ${provider}? Access removal is reversible.`)
    )
      return;
    await disconnect.mutateAsync({ provider });
    setToast(`${provider} disconnected.`);
    await status.refetch();
  };
  const setImapField = (key: keyof typeof imap, value: string | boolean) =>
    setImap(prev => ({ ...prev, [key]: value }));
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <GmailSetup status={status.data} onToast={setToast} />
      <section className="border border-line bg-white p-6 sm:p-7">
        <div className="flex items-start justify-between">
          <div>
            <MonoLabel>Included / lead sourcing</MonoLabel>
            <h2 className="mt-3 font-display text-2xl tracking-[-.04em]">
              Research runs behind the scenes.
            </h2>
          </div>
          <PlugZap className="h-5 w-5 text-terracotta" />
        </div>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          TailorPitch manages Apify for discovery and website research. You do
          not need a personal Apify account or API token. Choose your ICP in
          Leads, or set a conservative discovery pace in Agents.
        </p>
        <div className="mt-5 border-t border-line pt-4" aria-live="polite">
          {status.isLoading ? (
            <StatusChip>Checking configuration…</StatusChip>
          ) : status.isError ? (
            <p className="text-sm text-red-700">
              Could not load sourcing configuration. Retry the status check.
            </p>
          ) : status.data?.apify.connected ? (
            <StatusChip tone="good">
              {status.data.apify.managed
                ? "Managed by TailorPitch"
                : "Company sourcing configured"}
            </StatusChip>
          ) : (
            <StatusChip tone="warn">App owner setup required</StatusChip>
          )}
          <p className="mt-3 text-xs leading-5 text-ink-muted">
            Configuration does not start a scrape. Discovery and result sync can
            be paused independently in Leads. A check verifies provider access
            without creating a run or importing leads.
          </p>
          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => void checkApify()}
            disabled={verifyApify.isPending || !status.data?.apify.connected}
          >
            {verifyApify.isPending
              ? "Verifying provider access…"
              : "Check sourcing connection"}
          </Button>
          {status.isError && (
            <Button
              className="ml-3 mt-4"
              variant="secondary"
              onClick={() => void status.refetch()}
            >
              Retry status
            </Button>
          )}
        </div>
      </section>
      <section className="border border-line bg-white p-6 sm:p-7">
        <div className="flex items-start justify-between">
          <div>
            <MonoLabel>Gmail / OAuth</MonoLabel>
            <h2 className="mt-3 font-display text-2xl tracking-[-.04em]">
              Bring replies closer.
            </h2>
          </div>
          <Mail className="h-5 w-5 text-terracotta" />
        </div>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          Gmail uses OAuth for mailbox access. If the project client is not
          configured, the setup error is shown honestly.
        </p>
        <Button
          className="mt-6"
          variant="secondary"
          onClick={gmail}
          disabled={startGmail.isPending}
        >
          {startGmail.isPending ? "Opening…" : "Connect Gmail"}
        </Button>
        {status.data?.gmailAvailable === false && (
          <p className="mt-4 text-xs text-amber-800">
            Google OAuth client setup required. Callback path:{" "}
            <code>{status.data.gmailCallbackPath}</code>
          </p>
        )}
        {status.data?.mailbox.provider === "gmail" && (
          <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
            <StatusChip tone="good">Gmail connected</StatusChip>
            <button
              className="text-xs text-red-700 underline"
              onClick={() => void disconnectProvider("gmail")}
            >
              Disconnect
            </button>
          </div>
        )}
      </section>
      <section className="border border-line bg-white p-6 sm:p-7 xl:col-span-2">
        <div className="flex items-start justify-between">
          <div>
            <MonoLabel>IMAP + SMTP / mailbox and sending</MonoLabel>
            <h2 className="mt-3 font-display text-2xl tracking-[-.04em]">
              Use the mailbox you already trust.
            </h2>
          </div>
          <Mail className="h-5 w-5 text-terracotta" />
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
          SMTP is required for email sending. Port 465 uses implicit TLS; port
          587 uses STARTTLS. Credentials are sent over HTTPS and stored
          encrypted server-side.
        </p>
        <form onSubmit={connectM} className="mt-7 grid gap-5 lg:grid-cols-3">
          <TextInput
            label="Mailbox email"
            type="email"
            required
            value={imap.email}
            onChange={e => setImapField("email", e.target.value)}
          />
          <TextInput
            label="Username"
            required
            value={imap.username}
            onChange={e => setImapField("username", e.target.value)}
          />
          <TextInput
            label="Password / app password"
            type="password"
            autoComplete="new-password"
            required
            value={imap.password}
            onChange={e => setImapField("password", e.target.value)}
          />
          <TextInput
            label="IMAP host"
            required
            placeholder="imap.example.com"
            value={imap.imapHost}
            onChange={e => setImapField("imapHost", e.target.value)}
          />
          <TextInput
            label="IMAP port"
            type="number"
            required
            value={imap.imapPort}
            onChange={e => setImapField("imapPort", e.target.value)}
          />
          <label className="flex items-end gap-2 pb-3 text-xs">
            <input
              type="checkbox"
              checked={imap.imapSecure}
              onChange={e => setImapField("imapSecure", e.target.checked)}
            />
            Use secure IMAP (993)
          </label>
          <TextInput
            label="SMTP host"
            required
            placeholder="smtp.example.com"
            value={imap.smtpHost}
            onChange={e => setImapField("smtpHost", e.target.value)}
          />
          <TextInput
            label="SMTP port"
            type="number"
            required
            value={imap.smtpPort}
            onChange={e => setImapField("smtpPort", e.target.value)}
          />
          <label className="flex items-end gap-2 pb-3 text-xs">
            <input
              type="checkbox"
              checked={imap.smtpSecure}
              onChange={e => setImapField("smtpSecure", e.target.checked)}
            />
            Use implicit TLS (465)
          </label>
          <div className="lg:col-span-3">
            <Button type="submit" disabled={connectImap.isPending}>
              {connectImap.isPending
                ? "Testing connection…"
                : "Test & connect mailbox"}
            </Button>
          </div>
        </form>
        {status.data?.mailbox.provider === "imap" && (
          <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
            <StatusChip tone="good">IMAP + SMTP connected</StatusChip>
            <button
              className="text-xs text-red-700 underline"
              onClick={() => void disconnectProvider("imap")}
            >
              Disconnect
            </button>
          </div>
        )}
      </section>
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function DomainSettings({ workspace }: { workspace: Workspace }) {
  const [origin, setOrigin] = useState(workspace.company.publicOrigin || "");
  const [message, setMessage] = useState("");
  const save = api.workspace.saveBrand.useMutation();
  const utils = api.useUtils();
  const saveOrigin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await save.mutateAsync({
        brand: workspace.company.brand,
        publicOrigin: origin,
      });
      await utils.workspace.get.invalidate();
      setMessage("Public sharing origin saved. This does not connect DNS.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Origin could not be saved."
      );
    }
  };
  return (
    <div className="max-w-3xl">
      <section className="border border-line bg-white p-6 sm:p-8">
        <Globe2 className="h-6 w-6 text-terracotta" />
        <MonoLabel className="mt-6 block">Public origin</MonoLabel>
        <h2 className="mt-3 font-display text-3xl tracking-[-.05em]">
          Ready for a domain when you are.
        </h2>
        <p className="mt-4 text-sm leading-6 text-ink-muted">
          Set the origin used for public page and opt-out links. Custom domain
          attachment and DNS verification happen through the hosting dashboard.
          Saving an origin does not connect a domain.
        </p>
        <form onSubmit={saveOrigin} className="mt-7 space-y-4">
          <TextInput
            label="Public sharing origin"
            type="url"
            value={origin}
            onChange={e => setOrigin(e.target.value)}
            placeholder="https://app.example.com"
          />
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOrigin(window.location.origin)}
            >
              Use current preview origin
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save sharing origin"}
            </Button>
          </div>
          <p className="text-xs leading-5 text-ink-muted">
            A preview origin is temporary. After publishing or binding your
            custom domain, update this origin and the Google OAuth callback URL
            before sending new outreach.
          </p>
          {message && (
            <p role="status" className="text-sm text-terracotta">
              {message}
            </p>
          )}
        </form>
        <div className="mt-6 border-t border-line pt-5">
          <MonoLabel>Example share link / illustrative token</MonoLabel>
          <p className="mt-2 break-all font-mono text-xs text-terracotta">
            {origin || window.location.origin}/p/your-opaque-page-token
          </p>
        </div>
      </section>
    </div>
  );
}
