import { cn } from "@/lib/utils";

function scoreTone(score: number): {
  barClassName: string;
  label: string;
} {
  if (score >= 70) return { barClassName: "bg-stage-fresh", label: "Segar" };
  if (score >= 30) return { barClassName: "bg-stage-rescue", label: "Layu" };
  if (score >= 10) return { barClassName: "bg-stage-feed", label: "Layak pakan" };
  if (score > 0) return { barClassName: "bg-stage-residue", label: "Layak residu" };
  return { barClassName: "bg-stage-disposed", label: "Akhir siklus" };
}

/** Compact freshness score display with a tone-coded meter. */
export function FreshnessMeter({
  score,
  size = "md",
  className,
}: {
  score: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const tone = scoreTone(score);
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={cn(
            "font-semibold tabular-nums text-ink",
            size === "sm" ? "text-xs" : "text-sm",
          )}
        >
          {clamped}
          <span className="font-normal text-ink-muted">/100</span>
        </span>
        <span
          className={cn(
            "min-w-0 truncate text-ink-muted text-xs",
          )}
        >
          {tone.label}
        </span>
      </div>
      <div
        className={cn(
          "mt-1 overflow-hidden rounded-full bg-surface-muted",
          size === "sm" ? "h-1" : "h-1.5",
        )}
        role="meter"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Skor kesegaran ${clamped} dari 100`}
      >
        <div
          className={cn("h-full rounded-full", tone.barClassName)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
