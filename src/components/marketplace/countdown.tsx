"use client";

import { useEffect, useState } from "react";

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);

  if (days > 0) return `${days} hari ${hours} jam`;
  if (hours > 0) return `${hours} jam ${minutes} menit`;
  if (minutes > 0) return `${minutes} menit`;
  return "kurang dari 1 menit";
}

/**
 * Live countdown used for rescue-deal early access and deal windows.
 * Renders a static duration on the server and ticks on the client.
 */
export function Countdown({
  targetIso,
  prefix,
  expiredLabel,
  className,
}: {
  targetIso: string;
  prefix: string;
  expiredLabel: string;
  className?: string;
}) {
  const target = new Date(targetIso).getTime();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    function tick() {
      setRemaining((target - Date.now()) / 1000);
    }
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [target]);

  const expired = remaining !== null && remaining <= 0;

  return (
    <span className={className} suppressHydrationWarning>
      {remaining === null
        ? `${prefix} ${formatDuration((target - Date.now()) / 1000)}`
        : expired
          ? expiredLabel
          : `${prefix} ${formatDuration(remaining)}`}
    </span>
  );
}
