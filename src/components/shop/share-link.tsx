"use client";

import { useState, type RefCallback } from "react";
import { Check, Copy, Link2 } from "lucide-react";

/**
 * Read-only shareable link with a copy button. The current URL is written to
 * the output element in a ref callback so the server render stays stable and
 * no hydration-mismatching state is needed.
 */
export function ShareLink({ label }: { label?: string }) {
  const [copied, setCopied] = useState(false);

  const fillUrl: RefCallback<HTMLOutputElement> = (el) => {
    if (el) el.textContent = window.location.href;
  };

  async function copy() {
    if (copied) return;
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard access denied; the link remains visible to copy manually.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Link2 className="size-4" aria-hidden="true" />
        {label ?? "Bagikan tautan"}
      </p>
      <div className="mt-2 flex items-stretch gap-2">
        <output
          ref={fillUrl}
          className="min-w-0 flex-1 truncate rounded-lg border border-line bg-surface-muted px-3 py-2 text-xs text-ink-muted"
          aria-label="Tautan untuk dibagikan"
        >
          …
        </output>
        <button
          type="button"
          onClick={copy}
          aria-label="Salin tautan"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-semibold text-ink transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-brand-ink" aria-hidden="true" />
              Tersalin
            </>
          ) : (
            <>
              <Copy className="size-3.5" aria-hidden="true" />
              Salin
            </>
          )}
        </button>
      </div>
    </div>
  );
}
