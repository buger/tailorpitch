import { useState, type FormEvent } from "react";
import { Button, LeadloomWordmark, MonoLabel, TextInput } from "./LeadloomUI";
import { passwordResponseError } from "@shared/passwordResponse";
export function OwnerLogin({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("leonsbox@gmail.com");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(initialError);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(undefined);
    try {
      const challenge = await fetch("/api/auth/password/challenge", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const challengeText = await challenge.text();
      if (!challenge.ok)
        throw Error(passwordResponseError(challenge.status, challengeText));
      const data = JSON.parse(challengeText);
      const response = await fetch("/api/auth/password/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, nonce: data.nonce }),
      });
      if (!response.ok)
        throw Error(
          passwordResponseError(response.status, await response.text())
        );
      setPassword("");
      try {
        sessionStorage.removeItem("manus-cookie");
      } catch {}
      window.location.assign("/app");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try signing in again.");
      setPassword("");
      setPending(false);
    }
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-12">
      <section className="w-full max-w-md border border-line bg-white p-7 sm:p-10">
        <LeadloomWordmark />
        <MonoLabel className="mt-9 block text-terracotta">
          Your private workspace
        </MonoLabel>
        <h1 className="mt-3 font-display text-4xl leading-none">
          Back to your
          <br />
          next good lead.
        </h1>
        <p className="mt-4 text-sm leading-6 text-ink-muted">
          Sign in with your approved email and the temporary password you set
          securely.
        </p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <TextInput
            label="Email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={pending}
          />
          <TextInput
            label="Temporary password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={1024}
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={pending}
          />
          {error && (
            <p
              role="alert"
              className="border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Opening your workspace…" : "Sign in to TailorPitch"}
          </Button>
        </form>
        <p className="mt-5 text-xs leading-5 text-ink-muted">
          Temporary owner access only. This does not connect Gmail. Google
          sign-in can be added later.
        </p>
        <a href="/" className="mt-6 block text-sm underline">
          Back to TailorPitch
        </a>
      </section>
    </main>
  );
}
