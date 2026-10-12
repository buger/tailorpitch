import { useEffect, useRef } from "react";
import { api } from "./leadloom-types";
export function usePageOpen(
  token: string,
  ready: boolean,
  onRecorded?: () => void
) {
  const track = api.public.trackPageOpen.useMutation({
    retry: 2,
    retryDelay: 1000,
  });
  const sent = useRef<string | null>(null);
  const callback = useRef(onRecorded);
  callback.current = onRecorded;
  useEffect(() => {
    if (!ready || !token || sent.current === token) return;
    const count = () => {
      if (document.visibilityState !== "visible" || sent.current === token)
        return;
      sent.current = token;
      // New UUID per actual page mount/reload; only the same event is idempotent.
      const visitKey = crypto.randomUUID();
      track.mutate(
        { token, visitKey },
        {
          onSuccess: result => {
            if (result.recorded) callback.current?.();
          },
        }
      );
    };
    count();
    document.addEventListener("visibilitychange", count);
    return () => document.removeEventListener("visibilitychange", count);
  }, [token, ready]);
}
