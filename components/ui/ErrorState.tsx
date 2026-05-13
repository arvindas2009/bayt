'use client';

import { RotateCcw, AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}

export default function ErrorState({ error, reset, title = "Something went wrong here" }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center border-y border-[var(--outline-variant)] bg-[var(--surface-container-lowest)]">
      <AlertTriangle className="size-8 text-[var(--error)] mb-4" />
      <h2 className="text-xl font-bold font-space-grotesk text-[var(--on-surface)] mb-2">
        {title}
      </h2>
      <p className="text-sm font-mono text-[var(--on-surface-variant)] mb-6 max-w-md">
        {error.message || "An unexpected error disrupted this view."} {error.digest && `(Code: ${error.digest})`}
      </p>
      <button
        onClick={() => reset()}
        className="flex items-center gap-2 px-6 py-2.5 font-mono text-xs uppercase tracking-widest bg-[var(--surface-container-high)] hover:bg-[var(--surface-container-highest)] text-[var(--on-surface)] transition-colors"
      >
        <RotateCcw className="size-3.5" />
        Retry
      </button>
    </div>
  );
}