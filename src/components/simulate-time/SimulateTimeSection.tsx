import { SimulateTimeControl } from "./SimulateTimeControl";

/**
 * Admin-only time simulation panel. Rendered directly (no dynamic/ssr:false):
 * the control is a plain client component that server-renders fine, and a
 * client-only placeholder used to leave a large empty block on the dashboard.
 */
export function SimulateTimeSection() {
  return <SimulateTimeControl />;
}
