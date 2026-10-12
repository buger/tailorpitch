import { useEffect, useRef } from "react";
import { api } from "./leadloom-types";
export function usePageOpen(token: string, ready: boolean) {
  const track = api.public.trackPageOpen.useMutation();
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !token || sent.current === token) return;
    const count = () => {
      if (document.visibilityState !== "visible" || sent.current === token)
        return;
      sent.current = token;
      let visitKey: string;
      try {
        const key = `tailorpitch-page-tab:${token}`;
        visitKey = sessionStorage.getItem(key) ?? crypto.randomUUID();
        sessionStorage.setItem(key, visitKey);
      } catch {
        visitKey = crypto.randomUUID();
      }
      // Analytics errors must never block a proposal or its contact form.
      track.mutate({ token, visitKey });
    };
    count();
    document.addEventListener("visibilitychange", count);
    return () => document.removeEventListener("visibilitychange", count);
  }, [token, ready]);
}
