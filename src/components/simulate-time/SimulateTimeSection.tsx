"use client";

import dynamic from "next/dynamic";

const SimulateTimeControl = dynamic(
  () => import("./SimulateTimeControl").then((mod) => mod.SimulateTimeControl),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-surface-muted rounded-xl" /> }
);

export function SimulateTimeSection() {
  return <SimulateTimeControl />;
}