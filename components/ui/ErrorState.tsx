'use client';

import { RotateCcw, AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}

export default function ErrorState({ error, reset, title = "Something went wrong here" }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center border-y border-[var(--line-strong)] bg-[var(--bg)]">
      <AlertTriangle className="size-8 text-[var(--ember)] mb-4" />
      <h2 className="text-xl font-bold font-space-grotesk text-[var(--ink)] mb-2">
        {title}
      </h2>
      <p className="text-sm font-mono text-[var(--ink-muted)] mb-6 max-w-md">
        {error.message || "An unexpected error disrupted this view."} {error.digest && `(Code: ${error.digest})`}
      </p>
      <button
        onClick={() => reset()}
        className="flex items-center gap-2 px-6 py-2.5 text-sm bg-[var(--surface-high)] hover:bg-[var(--surface-high)] text-[var(--ink)] transition-colors"
      >
        <RotateCcw className="size-3.5" />
        Retry
      </button>
    </div>
  );
}