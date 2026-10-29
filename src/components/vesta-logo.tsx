import Image from "next/image";

type VestaLogoProps = {
  /** Size container, e.g. "size-8" or "size-9". */
  className?: string;
};

/**
 * Official brand mark. The SVG artwork already includes the VESTA wordmark,
 * so render it standalone inside a rounded, light-backed square.
 */
export function VestaLogo({ className = "size-9" }: VestaLogoProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-surface ${className}`}
    >
      <Image
        src="/Vesta.svg"
        alt="Logo Vesta"
        width={32}
        height={32}
        className="h-full w-full p-0.5"
      />
    </span>
  );
}
