import { cn } from "@/lib/utils";
import {
  STATUS_META,
  type BatchStatusValue,
} from "@/src/lib/batches/freshness";

export function StatusPill({
  status,
  className,
}: {
  status: BatchStatusValue;
  className?: string;
}) {
  const meta = STATUS_META[status];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        meta.className,
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", meta.dotClassName)}
        aria-hidden="true"
      />
      {meta.label}
    </span>
  );
}
