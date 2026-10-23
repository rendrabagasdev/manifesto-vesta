import { cn } from "@/lib/utils";

function scoreTone(score: number): string {
  if (score >= 70) return "bg-brand";
  if (score >= 30) return "bg-stage-rescue";
  if (score >= 10) return "bg-stage-feed";
  return "bg-stage-residue";
}

export function ScoreBadge({
  score,
  className,
  compact = false,
}: {
  score: number;
  className?: string;
  compact?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      aria-label={`Freshness score ${clamped} dari 100`}
    >
      <span className="text-sm font-semibold tabular-nums text-ink">
        {clamped}
        <span className="text-xs font-normal text-ink-muted">/100</span>
      </span>
      <span
        className={cn(
          "overflow-hidden rounded-full bg-surface-muted",
          compact ? "h-1 w-12" : "h-1.5 w-16",
        )}
        aria-hidden="true"
      >
        <span
          className={cn("block h-full rounded-full", scoreTone(clamped))}
          style={{ width: `${clamped}%` }}
        />
      </span>
    </div>
  );
}
