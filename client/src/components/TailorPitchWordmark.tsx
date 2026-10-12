import { cn } from "@/lib/utils";

/** Shared product wordmark for marketing, sign-in and the workspace. */
export function TailorPitchWordmark({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "tailorpitch-wordmark",
        compact && "tailorpitch-wordmark-compact",
        className
      )}
    >
      TailorPitch
    </span>
  );
}
