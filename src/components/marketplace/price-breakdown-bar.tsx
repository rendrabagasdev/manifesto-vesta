import { formatIdr } from "@/src/lib/batches/format";
import { cn } from "@/lib/utils";

export type BreakdownPart = {
  label: string;
  amountPerKg: number;
  className: string;
  hint?: string;
};

/**
 * Stacked horizontal bar showing where each rupiah of the final price goes.
 * Used on product cards, the breakdown page and traceability.
 */
export function PriceBreakdownBar({
  parts,
  className,
}: {
  parts: BreakdownPart[];
  className?: string;
}) {
  const total = parts.reduce((sum, part) => sum + part.amountPerKg, 0);
  if (total <= 0) return null;

  return (
    <div className={className}>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-surface-muted"
        role="img"
        aria-label={parts
          .map(
            (part) =>
              `${part.label} ${formatIdr(part.amountPerKg)} per kg`,
          )
          .join(", ")}
      >
        {parts.map((part) => (
          <div
            key={part.label}
            className={cn("h-full", part.className)}
            style={{
              width: `${(part.amountPerKg / total) * 100}%`,
            }}
          />
        ))}
      </div>
      <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {parts.map((part) => (
          <li key={part.label} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
              <span
                className={cn("size-2 shrink-0 rounded-full", part.className)}
                aria-hidden="true"
              />
              <span className="min-w-0 truncate">{part.label}</span>
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
              {formatIdr(part.amountPerKg)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
